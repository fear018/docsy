'use client';

import { useState } from 'react';
import { deleteBot } from './actions';
import { SubmitButton } from '@/components/ui';

/**
 * Deleting from the list, without a trip through settings.
 *
 * Still two steps: this removes a bot's sources, indexed pages and
 * conversations, and the widget stops answering on the customer's site the
 * moment it happens. A single click in a list is how that gets done by
 * accident.
 */
export function BotRowActions({ botId, name }: { botId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
        className="text-muted hover:text-fg rounded-lg px-2 py-1 text-sm transition"
      >
        Delete
      </button>
    );
  }

  return (
    <form action={deleteBot} className="flex items-center gap-2">
      <input type="hidden" name="botId" value={botId} />
      <span className="text-muted text-sm">Delete everything it indexed?</span>
      <SubmitButton variant="danger" pendingLabel="Deleting…">
        Delete
      </SubmitButton>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="border-line rounded-lg border px-3 py-2.5 text-sm font-medium"
      >
        Cancel
      </button>
    </form>
  );
}
