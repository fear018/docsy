'use server';

import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

export interface LoginState {
  error?: string;
  sentTo?: string;
}

/** The deployed origin, or localhost in development. */
async function origin() {
  const headerList = await headers();
  const host = headerList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/** Keep the post-login destination inside our own app. */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get('next'));
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });

  if (error || !data.url) {
    redirect(`/login?error=google&next=${encodeURIComponent(next)}`);
  }

  // Google's authorisation URL is external, so it is outside typedRoutes.
  redirect(data.url as Route);
}

const emailSchema = z.email('Enter a valid email address.');

export async function signInWithEmail(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = emailSchema.safeParse(formData.get('email'));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.' };
  }

  const next = safeNext(formData.get('next'));
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    // Supabase throttles sign-in emails; say so plainly instead of leaking the code.
    return {
      error:
        error.status === 429
          ? 'Too many attempts. Wait a minute and try again.'
          : 'We could not send the link. Try again in a moment.',
    };
  }

  return { sentTo: parsed.data };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
