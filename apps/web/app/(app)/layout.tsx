import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getEntitlements } from '@/lib/billing/entitlements';
import { UsageBanner } from '@/components/usage-banner';
import { SiteHeader } from '@/components/site-header';

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
      <SiteHeader signedIn />
      <UsageBanner usage={entitlements.usage} readOnlyBots={entitlements.readOnlyBotIds.size} />
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}
