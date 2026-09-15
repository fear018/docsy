'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MarketingNav() {
  const pathname = usePathname();
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
