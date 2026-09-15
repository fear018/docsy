import Link from 'next/link';
import type { Usage } from '@/lib/billing/usage';

/**
 * Shown once, at the top of the app, when something needs the owner's
 * attention. Deliberately not a toast: a quota that is nearly spent is a
 * standing condition, not an event that can be dismissed and forgotten.
 */
export function UsageBanner({ usage, readOnlyBots }: { usage: Usage; readOnlyBots: number }) {
  const messages = usage.messages;

  const notice = usage.pastDue
    ? {
        tone: 'warn' as const,
        text: 'The last payment failed. Update your card to keep your plan — nothing has been removed.',
        action: 'Update card',
      }
    : readOnlyBots > 0
      ? {
          tone: 'warn' as const,
          text: `${readOnlyBots} bot${readOnlyBots === 1 ? '' : 's'} sit above your plan and are read-only. Their widgets still answer; you cannot change their sources until you upgrade.`,
          action: 'See plans',
        }
      : !messages.allowed
        ? {
            tone: 'stop' as const,
            text: `Your ${messages.limit.toLocaleString()} messages for this month are used up. Visitors are told the assistant is unavailable.`,
            action: 'Upgrade',
          }
        : messages.warn
          ? {
              tone: 'warn' as const,
              text: `${messages.used.toLocaleString()} of ${messages.limit.toLocaleString()} messages used this month.`,
              action: 'See plans',
            }
          : null;

  if (!notice) return null;

  const colour =
    notice.tone === 'stop'
      ? 'border-red-500/50 bg-red-500/10'
      : 'border-amber-500/50 bg-amber-500/10';

  return (
    <div className={`border-b ${colour}`}>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5 text-sm">
        <span>{notice.text}</span>
        <Link href="/billing" className="font-medium underline underline-offset-2">
          {notice.action}
        </Link>
      </div>
    </div>
  );
}
