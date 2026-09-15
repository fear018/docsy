import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/billing/entitlements';
import { UsageBanner } from '@/components/usage-banner';
import { signOut } from '../(auth)/login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy already redirects anonymous visitors; this is the second
  // line of defence, and it also narrows the type for everything below.
  if (!user) redirect('/login');

  const entitlements = await getEntitlements(supabase);

  return (
    <div className="min-h-dvh">
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-5 py-3">
          <Link href="/bots" className="text-sm font-semibold tracking-wide uppercase">
            Docsy
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/bots" className="text-muted hover:text-fg transition">
              Bots
            </Link>
            <Link href="/billing" className="text-muted hover:text-fg transition">
              Plan
            </Link>
            <Link href="/settings" className="text-muted hover:text-fg transition">
              Settings
            </Link>
          </nav>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="text-muted hover:text-fg text-sm transition">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <UsageBanner usage={entitlements.usage} readOnlyBots={entitlements.readOnlyBotIds.size} />
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
