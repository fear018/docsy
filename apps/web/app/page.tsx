import { PLANS, PLAN_IDS } from '@docsy/shared';

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-24">
      <p className="text-muted text-sm font-medium tracking-wide uppercase">Docsy</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
        Turn your docs into a support agent that cites the docs.
      </h1>
      <p className="text-muted mt-5 max-w-xl text-lg">
        Point it at your documentation. Answers come back with links to the exact section — in a
        chat inside the app, and as a widget on your own site.
      </p>

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
  );
}
