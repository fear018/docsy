'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { deleteBot } from './actions';

/**
 * Deleting from the list, without a trip through settings.
 *
 * Still two clicks: deleting removes a bot's sources, indexed pages and
 * conversations, and its widget stops answering on the customer's site the
 * moment it happens. A single click in a list is how that gets done by
 * accident.
 *
 * The confirmation replaces the button in place and keeps the same height, so
 * the row does not jump and shove the rest of the list down.
 */

const BUTTON = 'rounded-lg px-2.5 py-1 text-sm transition whitespace-nowrap';

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BUTTON} font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/30`}
    >
      {pending ? 'Deleting…' : 'Yes, delete'}
    </button>
  );
}

export function BotRowActions({ botId, name }: { botId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${name}`}
        className={`${BUTTON} text-muted hover:text-fg`}
      >
        Delete
      </button>
    );
  }

  return (
    <form action={deleteBot} className="flex items-center gap-1">
      <input type="hidden" name="botId" value={botId} />
      <ConfirmButton />
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className={`${BUTTON} text-muted hover:text-fg`}
      >
        Cancel
      </button>
    </form>
  );
}
