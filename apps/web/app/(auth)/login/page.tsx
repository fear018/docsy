import type { Metadata } from 'next';
import Link from 'next/link';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in — Docsy' };

const ERRORS: Record<string, string> = {
  google: 'Google sign-in is unavailable right now. Use the email link instead.',
  callback: 'That sign-in link has expired or was already used. Request a new one.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-16">
      <Link href="/" className="text-muted text-sm font-medium tracking-wide uppercase">
        Docsy
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="text-muted mt-1 mb-8 text-sm">
        No password. Continue with Google, or we will email you a link.
      </p>

      <LoginForm next={next ?? '/bots'} initialError={error ? ERRORS[error] : undefined} />
    </main>
  );
}
