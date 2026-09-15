'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tabs appear as their release lands: chat in R2, widget in R3, insights in R5.
// A tab that leads nowhere is worse than one that is not there yet.
const TABS = [
  { slug: 'sources', label: 'Sources' },
  { slug: 'settings', label: 'Settings' },
] as const;

export function BotTabs({ botId }: { botId: string }) {
  const pathname = usePathname();

  return (
    <nav className="border-line mt-5 flex gap-1 border-b">
      {TABS.map((tab) => {
        // Inlined rather than held in a variable: assigning the template first
        // widens it to string and typedRoutes then rejects it.
        const active = pathname === `/bots/${botId}/${tab.slug}`;
        return (
          <Link
            key={tab.slug}
            href={`/bots/${botId}/${tab.slug}`}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
              active
                ? 'border-brand text-fg font-medium'
                : 'text-muted hover:text-fg border-transparent'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
