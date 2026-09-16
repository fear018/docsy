'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/bots', label: 'Bots' },
  { href: '/billing', label: 'Plan' },
  { href: '/settings', label: 'Settings' },
  // A page outside the app, but this is where someone stands when they wonder
  // where to put the snippet.
  { href: '/try', label: 'Try widget' },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        // A nested page still belongs to its section: /bots/abc/chat is Bots.
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-2.5 py-1.5 whitespace-nowrap transition ${
              active ? 'bg-surface text-fg font-medium' : 'text-muted hover:text-fg'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
