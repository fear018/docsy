import type { Metadata } from 'next';
import Link from 'next/link';
import { publicEnv } from '@/lib/env';
import { TryWidget } from './try-widget';

export const metadata: Metadata = {
  title: 'Try the widget — Docsy',
  description: 'Paste an embed snippet and see the widget running on a page that is not yours.',
  robots: { index: false, follow: true },
};

export default function TryPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Try the widget</h1>
      <p className="text-muted mt-3">
        This page stands in for a customer&rsquo;s website. The demo bot is already running in the
        corner; paste your own snippet to put your bot there instead, on a page that knows nothing
        about it.
      </p>

      <div className="mt-8">
        <TryWidget demoKey={publicEnv.NEXT_PUBLIC_DEMO_BOT_KEY ?? null} />
      </div>

      <section className="mt-10 space-y-3 text-sm">
        <h2 className="font-medium">What to look at</h2>
        <ul className="text-muted space-y-1.5">
          <li>
            — Nothing on this page reaches inside the widget, and nothing inside it reaches out. It
            runs in its own frame, which is why your stylesheet will not break it either.
          </li>
          <li>
            — Press Escape with the widget open. It closes and the focus returns to the launcher.
          </li>
          <li>
            — Narrow the window to a phone width. The panel fills the screen instead of floating.
          </li>
          <li>
            — Ask something the documentation does not cover. It says so rather than inventing an
            answer.
          </li>
        </ul>

        <h2 className="mt-6 font-medium">A note on what this page does</h2>
        <p className="text-muted">
          Your snippet is read, not run. We take the bot key and the few attributes we recognise and
          build the script tag ourselves, always pointing at our own widget. Executing a pasted
          script tag would hand this page to whoever pasted it.
        </p>
        <p className="text-muted">
          If your bot restricts which domains may use it, add this one to that list first —
          otherwise it will politely refuse, which is the behaviour working, not failing.
        </p>
      </section>

      <p className="text-muted mt-10 text-sm">
        <Link href="/" className="underline underline-offset-2">
          Back to the landing page
        </Link>
      </p>
    </main>
  );
}
