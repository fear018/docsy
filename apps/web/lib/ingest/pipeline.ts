import { createHash } from 'node:crypto';
import { getPlan } from '@docsy/shared';
import { createServiceClient } from '@/lib/supabase/service';
import { discoverUrls, fetchPage, FetchError, mapWithConcurrency } from './crawl';
import {
  htmlToMarkdown,
  pdfToMarkdown,
  docxToMarkdown,
  plainTextToMarkdown,
  UnreadableFileError,
} from './parse';
import { chunkMarkdown } from './chunk';
import { embedAll } from './embed';

/**
 * Turns a source into embedded chunks.
 *
 * Runs with the service role because it has no user session, so it derives the
 * owner from the source itself and enforces that owner's page limit.
 *
 * A documentation site takes minutes to index, longer than one serverless
 * invocation may run, so the work is resumable: discovery is stored once and
 * each pass handles what fits inside a time budget.
 */

/** Leaves room to write results and respond before the platform cuts us off. */
const TIME_BUDGET_MS = 45_000;
const PAGE_CONCURRENCY = 5;

export interface IngestResult {
  done: boolean;
  processed: number;
  failed: number;
}

function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function describe(error: unknown): string {
  if (error instanceof FetchError) return error.message;
  if (error instanceof UnreadableFileError) return error.message;
  if (error instanceof Error && /OPENAI_API_KEY/.test(error.message)) {
    return 'Indexing is unavailable right now. We have been notified.';
  }
  return 'We could not read that page.';
}

type Supabase = ReturnType<typeof createServiceClient>;

/** Writes one parsed page as a document plus its embedded chunks. */
async function storeDocument(
  supabase: Supabase,
  args: {
    botId: string;
    sourceId: string;
    url: string | null;
    title: string | null;
    markdown: string;
  },
): Promise<'stored' | 'unchanged' | 'empty' | 'duplicate'> {
  const contentHash = hash(args.markdown);

  if (args.url) {
    // Sitemaps often list several addresses that redirect to one canonical
    // page, and some sites serve the same shell for all of them. Indexing that
    // text three times costs three times as much and puts three copies of the
    // same answer in front of the retriever.
    const { data: duplicate } = await supabase
      .from('documents')
      .select('id, url')
      .eq('source_id', args.sourceId)
      .eq('content_hash', contentHash)
      .neq('url', args.url)
      .limit(1)
      .maybeSingle();
    if (duplicate) return 'duplicate';
  }

  const { data: existing } = await supabase
    .from('documents')
    .select('id, content_hash')
    .eq('source_id', args.sourceId)
    .eq('url', args.url ?? '')
    .maybeSingle();

  // The point of the hash: a re-sync of unchanged pages costs nothing.
  if (existing?.content_hash === contentHash) return 'unchanged';

  const chunks = chunkMarkdown(args.markdown);
  if (chunks.length === 0) return 'empty';

  const vectors = await embedAll(chunks.map((chunk) => chunk.content));

  let documentId: string;

  if (args.url) {
    // Upsert rather than delete-then-insert: pages are processed concurrently,
    // and two that redirect to the same address would otherwise race on the
    // unique (source_id, url) index and one would fail.
    const { data: document, error } = await supabase
      .from('documents')
      .upsert(
        {
          source_id: args.sourceId,
          bot_id: args.botId,
          title: args.title,
          url: args.url,
          content_hash: contentHash,
        },
        { onConflict: 'source_id,url' },
      )
      .select('id')
      .single();
    if (error || !document) throw new Error('Could not save the page.');
    documentId = document.id;
    await supabase.from('chunks').delete().eq('document_id', documentId);
  } else {
    if (existing) await supabase.from('documents').delete().eq('id', existing.id);
    const { data: document, error } = await supabase
      .from('documents')
      .insert({
        source_id: args.sourceId,
        bot_id: args.botId,
        title: args.title,
        url: null,
        content_hash: contentHash,
      })
      .select('id')
      .single();
    if (error || !document) throw new Error('Could not save the page.');
    documentId = document.id;
  }

  const { error: chunkError } = await supabase.from('chunks').insert(
    chunks.map((chunk, index) => ({
      document_id: documentId,
      bot_id: args.botId,
      content: chunk.content,
      heading_path: chunk.headingPath || null,
      token_count: chunk.tokenCount,
      embedding: JSON.stringify(vectors[index]),
    })),
  );

  if (chunkError) throw new Error('Could not save the page contents.');
  return 'stored';
}

async function loadFileMarkdown(
  supabase: Supabase,
  source: { storage_path: string | null; filename: string | null },
) {
  if (!source.storage_path) throw new Error('The file is missing.');

  const { data, error } = await supabase.storage.from('sources').download(source.storage_path);
  if (error || !data) throw new Error('We could not read that file.');

  const buffer = Buffer.from(await data.arrayBuffer());
  const name = source.filename ?? '';

  if (/\.pdf$/i.test(name)) return pdfToMarkdown(new Uint8Array(buffer));
  if (/\.docx$/i.test(name)) return docxToMarkdown(buffer);
  return plainTextToMarkdown(buffer.toString('utf8'), name);
}

export async function ingestSource(sourceId: string): Promise<IngestResult> {
  const startedAt = Date.now();
  const supabase = createServiceClient();

  const { data: source } = await supabase
    .from('sources')
    .select('*, bots!inner(id, user_id)')
    .eq('id', sourceId)
    .single();

  if (!source) return { done: true, processed: 0, failed: 0 };

  const botId = source.bots.id;
  const ownerId = source.bots.user_id;

  const fail = async (message: string) => {
    await supabase
      .from('sources')
      .update({ status: 'error', error_message: message })
      .eq('id', sourceId);
    return { done: true, processed: 0, failed: 1 };
  };

  try {
    await supabase
      .from('sources')
      .update({ status: 'processing', error_message: null })
      .eq('id', sourceId);

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('user_id', ownerId)
      .maybeSingle();
    const plan = getPlan(subscription?.plan ?? 'free');

    // Count pages already indexed across the owner's other bots, so one source
    // cannot spend the whole allowance.
    const { count: usedPages } = await supabase
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .neq('source_id', sourceId);
    const remaining = Math.max(0, plan.limits.pages - (usedPages ?? 0));

    if (remaining === 0) {
      return await fail(
        `The ${plan.name} plan covers ${plan.limits.pages} pages, and they are all in use.`,
      );
    }

    // ---- single-document sources -------------------------------------------
    if (source.type === 'text' || source.type === 'file') {
      const parsed =
        source.type === 'text'
          ? plainTextToMarkdown(source.url ?? '', source.filename ?? undefined)
          : await loadFileMarkdown(supabase, source);

      const outcome = await storeDocument(supabase, {
        botId,
        sourceId,
        url: null,
        title: parsed.title ?? source.filename,
        markdown: parsed.markdown,
      });

      if (outcome === 'empty') return await fail('That file has no readable text.');

      await supabase
        .from('sources')
        .update({
          status: 'ready',
          pages_count: 1,
          total_pages: 1,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', sourceId);
      return { done: true, processed: 1, failed: 0 };
    }

    // ---- web sources --------------------------------------------------------
    let urls = (source.discovered_urls as string[]) ?? [];

    if (urls.length === 0) {
      if (!source.url) return await fail('That source has no address.');
      const discovered = await discoverUrls(source.url, {
        pathPrefix: source.type === 'sitemap' ? (source.filename ?? undefined) : undefined,
        limit: source.type === 'sitemap' ? remaining : 1,
      });
      urls = discovered.urls;
      await supabase
        .from('sources')
        .update({ discovered_urls: urls, total_pages: urls.length })
        .eq('id', sourceId);
    }

    const { data: done } = await supabase.from('documents').select('url').eq('source_id', sourceId);
    const finished = new Set((done ?? []).map((d) => d.url));
    const pending = urls.filter((url) => !finished.has(url));

    let processed = 0;
    let failed = 0;

    // Work in waves so the time budget is checked between them rather than
    // mid-flight.
    for (let index = 0; index < pending.length; index += PAGE_CONCURRENCY) {
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        await supabase
          .from('sources')
          .update({ pages_count: finished.size + processed })
          .eq('id', sourceId);
        return { done: false, processed, failed };
      }

      const wave = pending.slice(index, index + PAGE_CONCURRENCY);
      const results = await mapWithConcurrency(wave, async (url) => {
        const page = await fetchPage(url);
        const parsed = htmlToMarkdown(page.html);
        return storeDocument(supabase, {
          botId,
          sourceId,
          url: page.url,
          title: parsed.title,
          markdown: parsed.markdown,
        });
      });

      for (const result of results) {
        if (result.status === 'fulfilled') processed += 1;
        else failed += 1;
      }
    }

    const pagesCount = finished.size + processed;

    // Every page failing is a broken source, not a finished one.
    if (pagesCount === 0 && failed > 0) {
      return await fail('We could not read any pages at that address.');
    }

    await supabase
      .from('sources')
      .update({
        status: 'ready',
        pages_count: pagesCount,
        last_synced_at: new Date().toISOString(),
        error_message:
          failed > 0 ? `${failed} page${failed === 1 ? '' : 's'} could not be read.` : null,
      })
      .eq('id', sourceId);

    return { done: true, processed, failed };
  } catch (error) {
    return await fail(describe(error));
  }
}
