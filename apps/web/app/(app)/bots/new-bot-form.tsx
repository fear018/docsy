'use client';

import { useActionState } from 'react';
import { botNameSchema } from '@docsy/shared';
import { createBot, type ActionState } from './actions';
import { FieldError, SubmitButton } from '@/components/ui';
import { Field } from '@/components/field';

export function NewBotForm({ compact = false }: { compact?: boolean }) {
  const [state, action] = useActionState<ActionState, FormData>(createBot, {});

  return (
    <form
      action={action}
      noValidate
      className={compact ? 'flex flex-wrap items-start gap-2' : 'mt-6'}
    >
      <div className={compact ? '' : 'mx-auto max-w-sm'}>
        <Field
          name="name"
          label="Bot name"
          hideLabel
          maxLength={60}
          placeholder="Acme docs"
          schema={botNameSchema}
          serverError={compact ? undefined : state.error}
          className="sm:w-64"
        />
      </div>
      <SubmitButton pendingLabel="Creating…" className={compact ? '' : 'mt-3'}>
        Create bot
      </SubmitButton>
      {compact && <FieldError id="bot-name-error">{state.error}</FieldError>}
    </form>
  );
}
