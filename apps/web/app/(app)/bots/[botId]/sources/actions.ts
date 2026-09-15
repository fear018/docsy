'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addUrlSourceSchema, addTextSourceSchema, sourceIdSchema, getPlan } from '@docsy/shared';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements, isReadOnly } from '@/lib/billing/entitlements';

export interface SourceState {
  error?: string;
}

const ACCEPTED = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'text/markdown': '.md',
  'text/plain': '.txt',
} as const;

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const FROZEN =
  'This bot is above what your plan covers, so its sources are frozen. Upgrade to change it.';

/**
 * Hiding a control is not enforcement — a form can be replayed. Every action
 * that changes a bot re-checks the freeze here, on the server.
 */
async function frozen(
  supabase: Awaited<ReturnType<typeof createClient>>,
  botId: string,
): Promise<boolean> {
  return isReadOnly(await getEntitlements(supabase), botId);
}

/** Refuses a new source once the owner's page allowance is spent. */
async function pagesExhausted(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: subscription } = await supabase.from('subscriptions').select('plan').maybeSingle();
  const plan = getPlan(subscription?.plan ?? 'free');
  const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true });
  return (count ?? 0) >= plan.limits.pages
    ? `The ${plan.name} plan covers ${plan.limits.pages} pages, and they are all in use.`
    : null;
}

export async function addUrlSource(_prev: SourceState, formData: FormData): Promise<SourceState> {
  const parsed = addUrlSourceSchema.safeParse({
    botId: formData.get('botId'),
    url: formData.get('url'),
    crawlSite: formData.get('crawlSite') === 'on',
    pathPrefix: formData.get('pathPrefix') || undefined,
    maxPages: formData.get('maxPages') || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the address and try again.' };
  }

  const supabase = await createClient();
  if (await frozen(supabase, parsed.data.botId)) return { error: FROZEN };
  const exhausted = await pagesExhausted(supabase);
  if (exhausted) return { error: exhausted };

  const { error } = await supabase.from('sources').insert({
    bot_id: parsed.data.botId,
    type: parsed.data.crawlSite ? 'sitemap' : 'url',
    url: parsed.data.url,
    // Reusing filename for the crawl's path filter keeps the schema narrow;
    // it is the only per-type option a web source carries.
    filename: parsed.data.crawlSite ? (parsed.data.pathPrefix ?? null) : null,
    max_pages: parsed.data.crawlSite ? parsed.data.maxPages : 1,
  });

  if (error) return { error: 'We could not add that source. Try again in a moment.' };

  revalidatePath(`/bots/${parsed.data.botId}/sources`);
  return {};
}

export async function addTextSource(_prev: SourceState, formData: FormData): Promise<SourceState> {
  const parsed = addTextSourceSchema.safeParse({
    botId: formData.get('botId'),
    title: formData.get('title'),
    content: formData.get('content'),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Check the text and try again.' };
  }

  const supabase = await createClient();
  if (await frozen(supabase, parsed.data.botId)) return { error: FROZEN };
  const exhausted = await pagesExhausted(supabase);
  if (exhausted) return { error: exhausted };

  // Pasted text lives in the url column: it is the source's content, and adding
  // a column used by one type only would be worse.
  const { error } = await supabase.from('sources').insert({
    bot_id: parsed.data.botId,
    type: 'text',
    url: parsed.data.content,
    filename: parsed.data.title,
  });

  if (error) return { error: 'We could not save that text. Try again in a moment.' };

  revalidatePath(`/bots/${parsed.data.botId}/sources`);
  return {};
}

export async function addFileSource(_prev: SourceState, formData: FormData): Promise<SourceState> {
  const botId = String(formData.get('botId') ?? '');
  const file = formData.get('file');

  if (!(file instanceof File) || file.size === 0) return { error: 'Choose a file first.' };
  if (file.size > MAX_FILE_BYTES) return { error: 'That file is larger than 20 MB.' };
  if (!(file.type in ACCEPTED)) {
    return { error: 'Upload a PDF, Word document, Markdown or text file.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (await frozen(supabase, botId)) return { error: FROZEN };
  const exhausted = await pagesExhausted(supabase);
  if (exhausted) return { error: exhausted };

  // The first path segment is the owner, which is what the storage policies check.
  const path = `${user.id}/${botId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from('sources').upload(path, file);
  if (uploadError) return { error: 'We could not upload that file. Try again in a moment.' };

  const { error } = await supabase.from('sources').insert({
    bot_id: botId,
    type: 'file',
    filename: file.name,
    storage_path: path,
  });

  if (error) {
    // Do not leave the bytes behind when the row failed.
    await supabase.storage.from('sources').remove([path]);
    return { error: 'We could not add that file. Try again in a moment.' };
  }

  revalidatePath(`/bots/${botId}/sources`);
  return {};
}

export async function deleteSource(formData: FormData) {
  const parsed = sourceIdSchema.safeParse({ sourceId: formData.get('sourceId') });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: source } = await supabase
    .from('sources')
    .select('bot_id, storage_path')
    .eq('id', parsed.data.sourceId)
    .maybeSingle();
  if (!source) return;
  if (await frozen(supabase, source.bot_id)) return;

  // Documents and chunks cascade; the stored file does not.
  await supabase.from('sources').delete().eq('id', parsed.data.sourceId);
  if (source.storage_path) await supabase.storage.from('sources').remove([source.storage_path]);

  revalidatePath(`/bots/${source.bot_id}/sources`);
}

export async function resyncSource(formData: FormData) {
  const parsed = sourceIdSchema.safeParse({ sourceId: formData.get('sourceId') });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: source } = await supabase
    .from('sources')
    .select('bot_id')
    .eq('id', parsed.data.sourceId)
    .maybeSingle();
  if (!source) return;
  if (await frozen(supabase, source.bot_id)) return;

  // Clearing discovery makes a re-sync pick up pages added since last time.
  // Existing documents stay: unchanged ones are skipped by content hash.
  await supabase
    .from('sources')
    .update({ status: 'queued', error_message: null, discovered_urls: [] })
    .eq('id', parsed.data.sourceId);

  revalidatePath(`/bots/${source.bot_id}/sources`);
}
