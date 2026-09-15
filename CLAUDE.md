# Docsy

Turn product documentation into a chatbot: available in-app as a chat interface and as an
embeddable widget for the customer's own website. Niche: SaaS / dev-tools documentation.

## Stack

- **App**: Next.js (App Router), TypeScript strict, Tailwind v4, shadcn/ui, TanStack Query
- **Data**: Supabase — Postgres + RLS, Auth, Storage, pgvector
- **AI**: OpenAI — `gpt-4o-mini` (answers), `text-embedding-3-small` / 1536 dims (embeddings)
- **Billing**: Stripe, test mode only
- **Deploy**: Vercel (free subdomain, no custom domain)

## Layout

```
apps/web          Next.js: app + landing + API routes
packages/shared   types, zod schemas, plan constants
packages/widget   widget.js — embeddable loader, no framework
supabase/         migrations, seed
evals/            question set for answer-quality runs
demo-site/        static page to test the widget on a foreign origin
```

## Rules

- **Never commit secrets.** `.env.local` is gitignored; the repo is public.
- Env lives in `apps/web/.env.local` — Next only reads it from its own directory, not the
  monorepo root. Root scripts that need it source it from there.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never reach a client bundle.
- Plan limits live in `packages/shared/src/plans.ts` — one source of truth, never inline a limit.
- Quota is checked **before** calling the model, never after.
- All external input is parsed with a zod schema from `packages/shared`.
- Database types are generated (`pnpm db:types`), never hand-edited.
- Public widget traffic goes through server routes only — never direct DB access.
- No `any` / `@ts-ignore` without a comment explaining why.
- UI text is English, in one voice. No raw error codes shown to users.
- Every screen ships its empty, loading and error state — not deferred.
- Works down to 390px width.

## Out of scope — do not add

Teams/roles/invites · human handoff · Slack/Discord/Intercom integrations · UI i18n ·
user-selectable models · fine-tuning · charts dashboard · white-label / custom widget domain /
arbitrary CSS · private docs behind authentication.

## Commands

```
pnpm dev          run the app
pnpm db:start     local Supabase
pnpm db:reset     re-apply all migrations
pnpm db:types     regenerate database types
pnpm eval         run the answer-quality question set
pnpm stripe:listen forward Stripe webhooks locally
```
