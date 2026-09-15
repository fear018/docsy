import { createClient } from '@/lib/supabase/server';
import { getEntitlements, isReadOnly } from '@/lib/billing/entitlements';
import { AddSource } from './add-source';
import { SourceList, type SourceRow } from './source-list';
import Link from 'next/link';

export default async function SourcesPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();
  const entitlements = await getEntitlements(supabase);
  const frozen = isReadOnly(entitlements, botId);

  const { data: sources, error } = await supabase
    .from('sources')
    .select(
      'id, type, url, filename, status, pages_count, total_pages, error_message, last_synced_at',
    )
    .eq('bot_id', botId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="border-line bg-surface rounded-lg border p-6">
        <p className="font-medium">We could not load this bot&rsquo;s sources</p>
        <p className="text-muted mt-1 text-sm">Refresh the page. If it persists, contact us.</p>
      </div>
    );
  }

  const rows = (sources ?? []) as SourceRow[];
  const ready = rows.filter((source) => source.status === 'ready');
  // The step nobody prompts for: indexing finished, and the owner is left on a
  // page that no longer has anything to do.
  const justFinished = ready.length > 0 && rows.every((source) => source.status !== 'processing');

  return (
    <div>
      {frozen ? (
        <div className="border-line rounded-lg border border-dashed p-6 text-sm">
          <p className="font-medium">This bot is read-only</p>
          <p className="text-muted mt-1">
            It sits above what your plan covers, so its sources are frozen. Nothing has been deleted
            and the widget still answers. Upgrade to edit it again.
          </p>
        </div>
      ) : (
        <AddSource botId={botId} />
      )}
      <SourceList sources={rows} />

      {justFinished && (
        <div className="border-line mt-6 rounded-lg border p-5">
          <p className="font-medium">
            {ready.reduce((sum, source) => sum + source.pages_count, 0)} pages are ready to answer
          </p>
          <p className="text-muted mt-1 text-sm">
            Try it the way your visitors will, then put it on your site.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/bots/${botId}/chat`}
              className="bg-brand text-brand-fg rounded-lg px-4 py-2.5 text-sm font-medium transition hover:opacity-90"
            >
              Ask it something
            </Link>
            <Link
              href={`/bots/${botId}/widget`}
              className="border-line hover:bg-surface rounded-lg border px-4 py-2.5 text-sm font-medium transition"
            >
              Get the embed snippet
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
