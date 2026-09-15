'use client';

import { useId, useState } from 'react';
import type { z } from 'zod';

/**
 * A text field that validates with the same zod schema the server uses.
 *
 * The browser's own validation was doing this before, and doing it badly: its
 * bubbles cannot be styled, appear in the browser's language rather than the
 * product's, and say "Please fill out this field" where we would say what the
 * field is for. Forms carry noValidate and this takes over.
 *
 * Checking starts only after the field has been left once. Telling someone
 * their email is invalid while they are still typing the first letter is
 * correct and useless.
 */

const BASE =
  'border-line focus:border-brand w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none';

export interface FieldProps extends Omit<React.ComponentProps<'input'>, 'id' | 'className'> {
  name: string;
  label: string;
  /** Validates this field's value. Errors come from the schema's own messages. */
  schema?: z.ZodType;
  /** Shown under the label, before anything goes wrong. */
  hint?: string;
  /** Visually hide the label but keep it for screen readers. */
  hideLabel?: boolean;
  /** An error the server returned for this field. */
  serverError?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
}

export function Field({
  name,
  label,
  schema,
  hint,
  hideLabel = false,
  serverError,
  multiline = false,
  rows = 4,
  className = '',
  defaultValue,
  onBlur,
  onChange,
  ...rest
}: FieldProps) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const check = (value: string) => {
    if (!schema) return;
    const result = schema.safeParse(value);
    setError(result.success ? null : (result.error.issues[0]?.message ?? 'Check this field.'));
  };

  const shown = error ?? serverError ?? null;
  const describedBy = [shown ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  const shared = {
    id,
    name,
    defaultValue,
    'aria-invalid': shown ? (true as const) : undefined,
    'aria-describedby': describedBy || undefined,
    className: `${BASE} ${shown ? 'border-red-500' : ''} ${className}`,
    onBlur: (event: React.FocusEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      setTouched(true);
      check(event.target.value);
      onBlur?.(event);
    },
    onChange: (event: React.ChangeEvent<HTMLInputElement & HTMLTextAreaElement>) => {
      // Re-check while typing only once they have already seen an error, so the
      // message clears as soon as it stops being true.
      if (touched) check(event.target.value);
      onChange?.(event);
    },
  };

  return (
    <div>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-muted block text-sm'}>
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-muted mt-0.5 text-xs">
          {hint}
        </p>
      )}
      <div className={hideLabel ? '' : 'mt-1'}>
        {multiline ? (
          <textarea
            {...(shared as React.ComponentProps<'textarea'>)}
            rows={rows}
            {...(rest as React.ComponentProps<'textarea'>)}
          />
        ) : (
          <input {...shared} {...rest} />
        )}
      </div>
      {shown && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 text-sm text-red-600 dark:text-red-400"
        >
          {shown}
        </p>
      )}
    </div>
  );
}
