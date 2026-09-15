import type { Metadata } from 'next';
import Link from 'next/link';
import type { Route } from 'next';
import { PLAN_IDS, PLANS } from '@docsy/shared';
import { publicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { DemoChat } from './demo-chat';

export const metadata: Metadata = {
  title: 'Docsy — turn your docs into a support agent that cites the docs',
  description:
    'Point Docsy at your documentation and get a chatbot that answers with links to the exact section — in your app and as a one-line widget on your site.',
  openGraph: {
    title: 'Docsy — answers from your own documentation',
    description:
      'One link in, a chatbot out. Answers cite the section they came from, and the report tells you what your docs are missing.',
    type: 'website',
  },
};

const STEPS = [
  {
    title: 'Point it at your docs',
    body: 'Paste the address of your documentation. We follow its sitemap, so you are not exporting files or copying pages by hand.',
  },
  {
    title: 'Check the answers',
    body: 'Ask it what your users ask. Every answer links to the section it came from, so you can tell at a glance whether it is right.',
  },
  {
    title: 'Paste one line',
    body: 'Drop the snippet on your site. The widget runs in its own frame, so your CSS and ours never meet.',
  },
];

const FEATURES = [
  {
    title: 'It follows your sitemap',
    body: 'Your knowledge is already published. Give us the URL rather than exporting forty files — and we index only the section you name, like /docs.',
  },
  {
    title: 'It stays current',
    body: 'Docs change every week. Docsy re-reads them on a schedule and skips pages that have not changed, so a bot built in March is not still answering with March.',
  },
  {
    title: 'It cites the section',
    body: 'Answers carry links to the exact heading they came from. When your bot is right, the reader can confirm it; when it is wrong, you can see why.',
  },
  {
    title: 'It handles code properly',
    body: 'Snippets are never split across chunks and come back exactly as written, with the language intact. Half a command is worse than no answer.',
  },
];

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`mx-auto max-w-5xl px-5 ${className}`}>
      {children}
    </section>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  /**
   * Carries the chosen plan all the way to checkout.
   *
   * Sending everyone to /login lost it twice over: someone already signed in
   * was bounced straight to their bots, and someone signing up arrived with no
   * memory of which plan they had picked.
   */
  // Typed as Route because the query is built at runtime, which typedRoutes
  // cannot verify on its own.
  const choosePlan = (plan: string): Route =>
    (user
      ? `/billing?plan=${plan}`
      : `/login?next=${encodeURIComponent(`/billing?plan=${plan}`)}`) as Route;

  return (
    <main className="pb-24">
      <Section className="pt-16 pb-14 sm:pt-24">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,28rem)]">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Turn your docs into a support agent that cites the docs.
            </h1>
            <p className="text-muted mt-5 max-w-xl text-lg">
              Point Docsy at your documentation. Answers come back with links to the exact section —
              in a chat inside the app, and as a one-line widget on your own site.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={user ? '/bots' : '/login'}
                className="bg-brand text-brand-fg rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
              >
                {user ? 'Open your bots' : 'Start free'}
              </Link>
              <span className="text-muted text-sm">
                {user ? 'Pick up where you left off.' : 'No card. 50 pages on the free plan.'}
              </span>
            </div>
            <p className="text-muted mt-6 text-sm">
              Built for SaaS and dev-tools teams whose documentation already answers most support
              tickets — just not where people are looking.
            </p>
          </div>

          <DemoChat publicKey={publicEnv.NEXT_PUBLIC_DEMO_BOT_KEY ?? null} />
        </div>
      </Section>

      <Section className="border-line border-t py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Five minutes, three steps</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="text-muted font-mono text-sm">0{index + 1}</span>
              <h3 className="mt-1 font-medium">{step.title}</h3>
              <p className="text-muted mt-1.5 text-sm">{step.body}</p>
            </li>
          ))}
        </ol>

        <pre className="border-line bg-surface mt-8 overflow-x-auto rounded-lg border p-4 text-[13px]">
          {`<script src="${publicEnv.NEXT_PUBLIC_APP_URL}/widget.js" data-bot="pk_…" defer></script>`}
        </pre>
      </Section>

      <Section className="border-line border-t py-14">
        <h2 className="text-2xl font-semibold tracking-tight">What makes it worth installing</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="border-line rounded-lg border p-5">
              <h3 className="font-medium">{feature.title}</h3>
              <p className="text-muted mt-1.5 text-sm">{feature.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className="border-line border-t py-14">
        <div className="border-line bg-surface rounded-xl border p-6 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight">
            It tells you what your documentation is missing
          </h2>
          <p className="text-muted mt-3 max-w-2xl">
            Every question the bot could not answer is a page worth writing. Docsy groups the
            wordings — &ldquo;how do I reset my password&rdquo;, &ldquo;password reset?&rdquo;,
            &ldquo;I forgot my password&rdquo; — into one line with a count, so twelve small
            mysteries become one obvious task.
          </p>
          <p className="text-muted mt-3 max-w-2xl">
            This is the part that keeps earning its place even when the bot is wrong.
          </p>

          <div className="border-line bg-bg mt-6 divide-y rounded-lg border text-sm">
            {[
              ['How do I cancel my subscription?', '14×'],
              ['Is there an API rate limit?', '9×'],
              ['Can I self-host this?', '6×'],
            ].map(([question, count]) => (
              <div key={question} className="flex items-center justify-between gap-4 px-4 py-3">
                <span>{question}</span>
                <span className="text-muted shrink-0 tabular-nums">asked {count}</span>
              </div>
            ))}
          </div>
          <p className="text-muted mt-2 text-xs">Illustration of the report, with sample rows.</p>
        </div>
      </Section>

      <Section id="pricing" className="border-line border-t py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
        <p className="text-muted mt-2">
          Limits are on volume, not on features. When you run out, the widget stays polite and
          nothing is deleted.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {PLAN_IDS.map((id) => {
            const plan = PLANS[id];
            const highlight = id === 'pro';
            return (
              <div
                key={id}
                className={`rounded-xl border p-5 ${highlight ? 'border-brand' : 'border-line'}`}
              >
                <div className="flex items-baseline justify-between">
                  <p className="font-semibold">{plan.name}</p>
                  {highlight && <span className="text-brand text-xs font-medium">Most teams</span>}
                </div>
                <p className="mt-2 text-3xl font-semibold">
                  ${plan.price}
                  <span className="text-muted text-sm font-normal">/mo</span>
                </p>
                <p className="text-muted mt-2 text-sm">{plan.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  <li>
                    {plan.limits.bots} bot{plan.limits.bots === 1 ? '' : 's'}
                  </li>
                  <li>{plan.limits.pages.toLocaleString()} indexed pages</li>
                  <li>{plan.limits.messagesPerMonth.toLocaleString()} messages a month</li>
                  <li className={plan.features.widgetBranding ? 'text-muted' : ''}>
                    {plan.features.widgetBranding ? 'Powered by Docsy badge' : 'No Docsy badge'}
                  </li>
                  <li className={plan.features.gapReport ? '' : 'text-muted'}>
                    {plan.features.gapReport ? 'Unanswered-questions report' : 'No gap report'}
                  </li>
                  <li className="text-muted capitalize">{plan.features.autoSync} re-indexing</li>
                </ul>
                <Link
                  href={id === 'free' ? (user ? '/bots' : '/login') : choosePlan(id)}
                  className={`mt-5 block rounded-lg px-4 py-2.5 text-center text-sm font-medium transition ${
                    highlight
                      ? 'bg-brand text-brand-fg hover:opacity-90'
                      : 'border-line hover:bg-surface border'
                  }`}
                >
                  {id === 'free' ? (user ? 'Open app' : 'Start free') : `Choose ${plan.name}`}
                </Link>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="faq" className="border-line border-t py-14">
        <h2 className="text-2xl font-semibold tracking-tight">Questions people actually ask</h2>
        <div className="mt-8 max-w-3xl space-y-5">
          {[
            [
              'Can it read documentation behind a login?',
              'Not yet. Public pages and uploaded files only. If your docs are private, export them as PDF, Word, Markdown or text and upload those — the result is the same, the setup is just less pleasant.',
            ],
            [
              'Where does my content go?',
              'Into our database, and to OpenAI to be turned into embeddings and answers. Nothing is used to train a model. Delete a source and its pages and embeddings go with it.',
            ],
            [
              'What happens when the bot is wrong?',
              'It cites the section it used, so you can see where it went astray and fix the page. When the documentation does not cover something, it says so rather than inventing an answer — and that question lands in your gap report.',
            ],
            [
              'What do my visitors see when I run out of messages?',
              'A short note that the assistant is unavailable, and nothing about billing. Your customers should never learn about your invoice from us.',
            ],
            [
              'Will the widget break my site?',
              'It is one script tag and a frame. The loader is about a kilobyte, loads when someone opens it, and your stylesheet cannot reach inside — which is the usual reason embedded widgets look wrong.',
            ],
            ['Can I remove the Docsy badge?', 'On any paid plan, yes.'],
          ].map(([question, answer]) => (
            <details key={question} className="border-line rounded-lg border px-4 py-3">
              <summary className="cursor-pointer font-medium">{question}</summary>
              <p className="text-muted mt-2 text-sm">{answer}</p>
            </details>
          ))}
        </div>
      </Section>

      <Section className="border-line border-t pt-14">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Point it at your docs and see for yourself
          </h2>
          <p className="text-muted mx-auto mt-3 max-w-lg">
            The free plan indexes 50 pages, which is enough to tell whether the answers are any
            good. That is the only question worth asking first.
          </p>
          <Link
            href={user ? '/bots' : '/login'}
            className="bg-brand text-brand-fg mt-6 inline-block rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
          >
            {user ? 'Open your bots' : 'Start free'}
          </Link>
        </div>
      </Section>
    </main>
  );
}
