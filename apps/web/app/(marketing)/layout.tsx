import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { MarketingNav } from './marketing-nav';

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  // Read on the server rather than in the browser: checking after hydration
  // would show "Sign in" to someone already signed in and then swap it.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-dvh">
      <header className="border-line sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3.5">
          <Link href="/" className="text-sm font-semibold tracking-wide uppercase">
            Docsy
          </Link>
          <MarketingNav signedIn={Boolean(user)} />
        </div>
      </header>

      {children}

      <footer className="border-line border-t">
        <div className="text-muted mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm">
          <span>Docsy — answers from your own documentation.</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:text-fg transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fg transition">
              Terms
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
