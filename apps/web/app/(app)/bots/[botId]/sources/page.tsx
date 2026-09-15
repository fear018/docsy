import { createClient } from '@/lib/supabase/server';
import { AddSource } from './add-source';
import { SourceList, type SourceRow } from './source-list';

export default async function SourcesPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();

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
      <AddSource botId={botId} />
      <SourceList sources={sources as SourceRow[]} />
    </div>
  );
}
