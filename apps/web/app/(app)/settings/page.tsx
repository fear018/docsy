import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Settings — Docsy' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, created_at')
    .single();

  return (
    <div className="max-w-lg">
      <h1 className="text-lg font-semibold">Settings</h1>

      <dl className="border-line mt-6 divide-y rounded-lg border">
        <div className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted">Email</dt>
          <dd>{profile?.email ?? user?.email}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted">Name</dt>
          <dd>{profile?.full_name ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted">Plan</dt>
          <dd>Free</dd>
        </div>
      </dl>

      <p className="text-muted mt-4 text-sm">Billing and plan changes arrive in R4.</p>
    </div>
  );
}
