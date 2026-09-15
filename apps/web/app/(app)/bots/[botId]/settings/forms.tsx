'use client';

import { useActionState, useState } from 'react';
import { renameBot, deleteBot, type ActionState } from '../../actions';
import { FieldError, SubmitButton } from '@/components/ui';

export function RenameBotForm({ botId, name }: { botId: string; name: string }) {
  const [state, action] = useActionState<ActionState, FormData>(renameBot, {});

  return (
    <form action={action} className="mt-3 flex flex-wrap items-start gap-2">
      <input type="hidden" name="botId" value={botId} />
      <div>
        <label htmlFor="rename" className="sr-only">
          Bot name
        </label>
        <input
          id="rename"
          name="name"
          defaultValue={name}
          required
          maxLength={60}
          aria-describedby={state.error ? 'rename-error' : undefined}
          className="border-line focus:border-brand w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm outline-none sm:w-64"
        />
      </div>
      <SubmitButton variant="ghost" pendingLabel="Saving…">
        Save
      </SubmitButton>
      <FieldError id="rename-error">{state.error}</FieldError>
    </form>
  );
}

export function DeleteBotForm({ botId, name }: { botId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="border-line mt-3 rounded-lg border px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        Delete bot
      </button>
    );
  }

  return (
    <form action={deleteBot} className="border-line mt-3 rounded-lg border p-4">
      <input type="hidden" name="botId" value={botId} />
      <p className="text-sm">
        Delete <span className="font-medium">{name}</span> and everything it has indexed?
      </p>
      <div className="mt-3 flex gap-2">
        <SubmitButton variant="danger" pendingLabel="Deleting…">
          Yes, delete it
        </SubmitButton>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="border-line rounded-lg border px-4 py-2.5 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
