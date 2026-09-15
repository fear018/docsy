import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms — Docsy',
  description: 'The terms under which Docsy is provided.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Terms</h1>
      <p className="text-muted mt-2 text-sm">Last updated 15 September 2026.</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-medium">What this is</h2>
          <p className="text-muted mt-2">
            Docsy is a demonstration project. Payments run in Stripe&rsquo;s test mode, so no money
            changes hands and no card is ever charged. There is no service level, no support
            commitment, and the data may be reset.
          </p>
        </section>

        <section>
          <h2 className="font-medium">What you may index</h2>
          <p className="text-muted mt-2">
            Documentation you own or have permission to use. We honour robots.txt and crawl
            politely, but the responsibility for what you point us at is yours.
          </p>
        </section>

        <section>
          <h2 className="font-medium">What the bot says</h2>
          <p className="text-muted mt-2">
            Answers are generated from your own pages and can be wrong. Every answer cites its
            source so a reader can check. Do not use Docsy where a wrong answer causes harm —
            medical, legal or financial advice, for instance.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Limits and fair use</h2>
          <p className="text-muted mt-2">
            Each plan states its limits. Exceeding them stops further messages until the next
            period; nothing is deleted. Automated abuse of the public widget endpoint may be
            blocked.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Ending it</h2>
          <p className="text-muted mt-2">
            Cancel at any time from the billing page. Your plan continues to the end of the period
            you paid for, then drops to Free — bots above the Free allowance become read-only rather
            than being deleted.
          </p>
        </section>
      </div>
    </main>
  );
}
