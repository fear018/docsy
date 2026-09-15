'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { z } from 'zod';
import { signInWithEmail, signInWithGoogle, type LoginState } from './actions';
import { Field } from '@/components/field';

function SubmitButton({ children, variant }: { children: string; variant: 'primary' | 'ghost' }) {
  const { pending } = useFormStatus();
  const base =
    'flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60';
  const styles =
    variant === 'primary'
      ? 'bg-brand text-brand-fg hover:opacity-90'
      : 'border border-line hover:bg-surface';

  return (
    <button type="submit" disabled={pending} className={`${base} ${styles}`}>
      {pending ? 'One moment…' : children}
    </button>
  );
}

const emailField = z.email('Enter a valid email address.');

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(signInWithEmail, {
    error: initialError,
  });

  if (state.sentTo) {
    return (
      <div className="border-line bg-surface rounded-lg border p-5">
        <p className="font-medium">Check your inbox</p>
        <p className="text-muted mt-1 text-sm">
          We sent a sign-in link to <span className="text-fg">{state.sentTo}</span>. It expires in
          an hour.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value={next} />
        <SubmitButton variant="ghost">Continue with Google</SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <span className="bg-line h-px flex-1" />
        <span className="text-muted text-xs uppercase">or</span>
        <span className="bg-line h-px flex-1" />
      </div>

      <form action={formAction} noValidate className="space-y-3">
        <input type="hidden" name="next" value={next} />
        <Field
          name="email"
          label="Email address"
          hideLabel
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          schema={emailField}
          serverError={state.error}
        />
        <SubmitButton variant="primary">Email me a link</SubmitButton>
      </form>
    </div>
  );
}
