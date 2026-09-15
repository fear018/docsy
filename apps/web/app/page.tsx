import Link from 'next/link';
import { PLANS, PLAN_IDS } from '@docsy/shared';

export default function HomePage() {
  return (
    <>
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <span className="text-sm font-semibold tracking-wide uppercase">Docsy</span>
          <Link href="/login" className="text-muted hover:text-fg text-sm font-medium transition">
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-20">
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turn your docs into a support agent that cites the docs.
        </h1>
        <p className="text-muted mt-5 max-w-xl text-lg">
          Point it at your documentation. Answers come back with links to the exact section — in a
          chat inside the app, and as a widget on your own site.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/login"
            className="bg-brand text-brand-fg rounded-lg px-5 py-2.5 text-sm font-medium transition hover:opacity-90"
          >
            Start free
          </Link>
          <span className="text-muted text-sm">No card. 50 pages on the free plan.</span>
        </div>

        <section className="border-line mt-16 border-t pt-8">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Plans</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {PLAN_IDS.map((id) => {
              const plan = PLANS[id];
              return (
                <li key={id} className="border-line bg-surface rounded-lg border p-4">
                  <p className="font-semibold">{plan.name}</p>
                  <p className="mt-1 text-2xl font-semibold">
                    ${plan.price}
                    <span className="text-muted text-sm font-normal">/mo</span>
                  </p>
                  <p className="text-muted mt-2 text-sm">{plan.tagline}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <p className="text-muted mt-16 text-sm">Scaffold — the real landing page lands in R6.</p>
      </main>
    </>
  );
}
