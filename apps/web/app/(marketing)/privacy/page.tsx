import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy — Docsy',
  description: 'What Docsy stores, who it is shared with, and how to remove it.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
      <p className="text-muted mt-2 text-sm">Last updated 15 September 2026.</p>

      <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-medium">What we store about you</h2>
          <p className="text-muted mt-2">
            Your email address and name, taken from however you signed in. Your billing details are
            held by Stripe, not by us — we keep only the customer and subscription identifiers
            needed to know which plan you are on.
          </p>
        </section>

        <section>
          <h2 className="font-medium">What we store about your documentation</h2>
          <p className="text-muted mt-2">
            The pages you point us at, the files you upload, and the numerical representations we
            build from them so the bot can search. Delete a source and its pages and embeddings are
            deleted with it.
          </p>
        </section>

        <section>
          <h2 className="font-medium">What we store about your visitors</h2>
          <p className="text-muted mt-2">
            The questions asked and the answers given, so you can read your own conversations and
            see what went unanswered. We do not store visitor IP addresses. Rate limiting uses a
            one-way hash that cannot be turned back into an address and is useless outside your bot.
          </p>
          <p className="text-muted mt-2">
            Conversations are kept for the period your plan states — 7 days on Free, 90 on Pro — and
            then deleted. Not hidden: deleted.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Who else sees it</h2>
          <p className="text-muted mt-2">
            OpenAI processes your documentation and the questions asked of it, to produce embeddings
            and answers. Supabase hosts the database and files. Stripe handles payment. Vercel
            serves the site. Sentry receives error reports, which may contain a URL or a user
            identifier but not your documentation.
          </p>
          <p className="text-muted mt-2">
            Your content is not used to train anyone&rsquo;s model, and we do not sell it.
          </p>
        </section>

        <section>
          <h2 className="font-medium">Removing it</h2>
          <p className="text-muted mt-2">
            Deleting a bot removes its sources, indexed pages and conversations. Deleting your
            account removes everything above. Both take effect immediately rather than being queued.
          </p>
        </section>

        <section>
          <h2 className="font-medium">A note on what this is</h2>
          <p className="text-muted mt-2">
            Docsy is a demonstration project. It is built to production standards, but it is not
            operated as a commercial service, and you should not put confidential documentation into
            it.
          </p>
        </section>
      </div>
    </main>
  );
}
