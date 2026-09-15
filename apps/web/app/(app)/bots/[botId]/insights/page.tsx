import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsage } from '@/lib/billing/usage';
import { groupGaps, type UnansweredQuestion } from '@/lib/analytics/gaps';
import { retentionCutoff, timeAgo } from '@/lib/analytics/retention';
import { Conversations } from './conversations';

export default async function InsightsPage({ params }: { params: Promise<{ botId: string }> }) {
  const { botId } = await params;
  const supabase = await createClient();
  const usage = await getUsage(supabase);
  const cutoff = retentionCutoff(usage.plan.limits.historyDays);

  let query = supabase
    .from('messages')
    .select('content, created_at, was_answered, conversations!inner(bot_id, channel)')
    .eq('conversations.bot_id', botId)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(500);
  if (cutoff) query = query.gte('created_at', cutoff);

  const { data: rows, error } = await query;

  if (error) {
    return (
      <div className="border-line bg-surface rounded-lg border p-6">
        <p className="font-medium">We could not load the history</p>
        <p className="text-muted mt-1 text-sm">Refresh the page. If it persists, contact us.</p>
      </div>
    );
  }

  const asked = rows ?? [];

  // A question counts as a gap when the answer that followed it reported no
  // coverage. The flag is written by the answer itself, not guessed here.
  const { data: answers } = await supabase
    .from('messages')
    .select('created_at, was_answered, conversations!inner(bot_id)')
    .eq('conversations.bot_id', botId)
    .eq('role', 'assistant')
    .eq('was_answered', false)
    .order('created_at', { ascending: false })
    .limit(500);

  const failedAt = (answers ?? []).map((a) => new Date(a.created_at).getTime());
  const unanswered: UnansweredQuestion[] = asked
    .filter((row) =>
      // The question immediately preceding a failed answer, within a minute.
      failedAt.some((time) => {
        const gap = time - new Date(row.created_at).getTime();
        return gap >= 0 && gap < 60_000;
      }),
    )
    .map((row) => ({
      content: row.content,
      createdAt: row.created_at,
      channel: row.conversations.channel,
    }));

  const gaps = groupGaps(unanswered);

  return (
    <div className="space-y-10">
      <section>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-medium">Questions we could not answer</h2>
          <span className="text-muted text-sm">
            {usage.plan.limits.historyDays === null
              ? 'All time'
              : `Last ${usage.plan.limits.historyDays} days`}
          </span>
        </div>

        {!usage.plan.features.gapReport ? (
          <div className="border-line mt-3 rounded-lg border border-dashed p-6 text-sm">
            <p className="font-medium">Available on Pro</p>
            <p className="text-muted mt-1">
              The report turns what your bot could not answer into a list of pages worth writing. It
              is the part of this product that is useful even when the bot is wrong.
            </p>
            <Link
              href="/billing"
              className="mt-3 inline-block font-medium underline underline-offset-2"
            >
              See plans
            </Link>
          </div>
        ) : gaps.length === 0 ? (
          <div className="border-line mt-3 rounded-lg border border-dashed p-6 text-sm">
            <p className="font-medium">Nothing unanswered yet</p>
            <p className="text-muted mt-1">
              Either your documentation covers what people ask, or nobody has asked yet.
            </p>
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {gaps.map((gap) => (
              <li key={gap.question} className="border-line rounded-lg border px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium">{gap.question}</p>
                  <span className="text-muted shrink-0 text-sm tabular-nums">
                    asked {gap.count}×
                  </span>
                </div>
                <p className="text-muted mt-1 text-sm">
                  {timeAgo(gap.lastAsked)}
                  {gap.fromWidget > 0 && ` · ${gap.fromWidget} from your site`}
                </p>
                {gap.variants.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-muted cursor-pointer text-sm">
                      {gap.variants.length} other wording{gap.variants.length === 1 ? '' : 's'}
                    </summary>
                    <ul className="text-muted mt-1 space-y-0.5 text-sm">
                      {gap.variants.map((variant) => (
                        <li key={variant}>— {variant}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <Conversations
        botId={botId}
        retentionDays={usage.plan.limits.historyDays}
        total={asked.length}
      />
    </div>
  );
}
