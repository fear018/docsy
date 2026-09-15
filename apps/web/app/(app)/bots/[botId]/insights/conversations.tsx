import { createClient } from '@/lib/supabase/server';
import { retentionCutoff } from '@/lib/analytics/retention';

function when(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function Conversations({
  botId,
  retentionDays,
  total,
}: {
  botId: string;
  retentionDays: number | null;
  total: number;
}) {
  const supabase = await createClient();
  const cutoff = retentionCutoff(retentionDays);

  let query = supabase
    .from('conversations')
    .select('id, title, channel, created_at')
    .eq('bot_id', botId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (cutoff) query = query.gte('created_at', cutoff);

  const { data: conversations } = await query;

  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-medium">Conversations</h2>
        <span className="text-muted text-sm">
          {total} question{total === 1 ? '' : 's'} in the window
        </span>
      </div>

      {!conversations || conversations.length === 0 ? (
        <div className="border-line mt-3 rounded-lg border border-dashed p-6 text-sm">
          <p className="font-medium">No conversations yet</p>
          <p className="text-muted mt-1">
            Ask something in the Chat tab, or install the widget and let a visitor try it.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="border-line flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1 truncate">{conversation.title ?? 'Untitled'}</span>
              <span className="text-muted shrink-0">
                {conversation.channel === 'widget' ? 'your site' : 'in app'} ·{' '}
                {when(conversation.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {retentionDays !== null && (
        <p className="text-muted mt-3 text-sm">
          Conversations are kept for {retentionDays} days on your plan, then deleted.
        </p>
      )}
    </section>
  );
}
