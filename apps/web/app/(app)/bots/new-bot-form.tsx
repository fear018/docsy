'use client';

import { useActionState } from 'react';
import { createBot, type ActionState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';

export function NewBotForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(createBot, {});

  return (
    <form action={action} className={compact ? 'flex flex-wrap items-start gap-2' : 'mt-6'}>
      <div className={compact ? '' : 'mx-auto max-w-sm'}>
        <label htmlFor="bot-name" className="sr-only">
          Bot name
        </label>
        <input
          id="bot-name"
          name="name"
          required
          maxLength={60}
          placeholder="Acme docs"
          aria-describedby={state.error ? 'bot-name-error' : undefined}
          className="border-line focus:border-brand w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm outline-none sm:w-64"
        />
        {!compact && <FieldError id="bot-name-error">{state.error}</FieldError>}
      </div>
      <SubmitButton pendingLabel="Creating…" className={compact ? '' : 'mt-3'}>
        Create bot
      </SubmitButton>
      {compact && <FieldError id="bot-name-error">{state.error}</FieldError>}
    </form>
  );
}
