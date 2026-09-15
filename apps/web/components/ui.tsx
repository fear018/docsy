'use client';

import { useFormStatus } from 'react-dom';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-60';

const VARIANTS = {
  primary: 'bg-brand text-brand-fg hover:opacity-90',
  ghost: 'border border-line hover:bg-surface',
  danger: 'border border-line text-red-600 hover:bg-surface dark:text-red-400',
} as const;

export function SubmitButton({
  children,
  pendingLabel = 'Working…',
  variant = 'primary',
  className = '',
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
      {children}
    </p>
  );
}
