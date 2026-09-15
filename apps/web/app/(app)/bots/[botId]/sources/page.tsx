import { createClient } from '@/lib/supabase/server';
import { getEntitlements, isReadOnly } from '@/lib/billing/entitlements';
import { AddSource } from './add-source';
import { SourceList, type SourceRow } from './source-list';

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
      <SourceList sources={sources as SourceRow[]} />
    </div>
  );
}
