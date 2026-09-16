'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppNav } from '../(app)/app-nav';
import { signOut } from '../(auth)/login/actions';

/**
 * Signed out, this is a marketing header: pricing, FAQ, sign in.
 *
 * Signed in, it is the app's own header. Someone with an account reading the
 * landing page or trying the widget is already inside the product, and giving
 * them a different set of links on every second page is how people lose track
 * of where they are.
 */
export function MarketingNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();

  if (signedIn) {
    return (
      <div className="flex items-center gap-4">
        <AppNav />
        <form action={signOut}>
          <button type="submit" className="text-muted hover:text-fg text-sm transition">
            Sign out
          </button>
        </form>
      </div>
    );
  }

  // The anchors only lead anywhere on the landing page itself.
  const onLanding = pathname === '/';

  return (
    <nav className="flex items-center gap-5 text-sm">
      {onLanding ? (
        <>
          <a href="#pricing" className="text-muted hover:text-fg hidden transition sm:block">
            Pricing
          </a>
          <a href="#faq" className="text-muted hover:text-fg hidden transition sm:block">
            FAQ
          </a>
        </>
      ) : (
        <Link href="/" className="text-muted hover:text-fg hidden transition sm:block">
          Home
        </Link>
      )}
      <Link href="/login" className="font-medium">
        Sign in
      </Link>
    </nav>
  );
}
