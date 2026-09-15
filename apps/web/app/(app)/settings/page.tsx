import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getUsage } from '@/lib/billing/usage';

export const metadata: Metadata = { title: 'Settings — Docsy' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const usage = await getUsage(supabase);

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
          <dd>
            {usage.plan.name}
            <Link href="/billing" className="text-brand ml-2 underline-offset-2 hover:underline">
              Change
            </Link>
          </dd>
        </div>
      </dl>
    </div>
  );
}
