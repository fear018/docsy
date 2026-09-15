---
name: add-migration
description: Add a Supabase migration to Docsy with its RLS policies, verify it locally and regenerate types. Use whenever a table, column, index or policy changes.
---

# Adding a migration

A migration that creates a table without policies leaves that table readable by
anyone holding the anon key. Treat the policy half as part of the migration, not
a follow-up.

## Write it

Create `supabase/migrations/<YYYYMMDDHHMMSS>_<snake_case_summary>.sql`. Use a
timestamp after the last existing file — migrations apply in filename order.

For a new table, the file must contain all of:

1. The table, with `id uuid primary key default gen_random_uuid()` unless it is
   keyed by something else.
2. A foreign key that reaches an owner — directly via `user_id references
profiles`, or indirectly via `bot_id references bots`.
3. Indexes for the columns it will actually be filtered by.
4. `create trigger <table>_updated_at before update ... execute function
set_updated_at()` if it has an `updated_at` column.
5. `alter table <name> enable row level security;`
6. Policies. For owner-keyed tables compare against `(select auth.uid())`. For
   bot-scoped tables call `owns_bot(bot_id)` — it already exists, do not
   reimplement the ownership check inline.

Grant nothing to `anon`. Public widget traffic never reaches the database
directly; it goes through server routes using the service role after checking
the bot's public key, the request Origin and the plan quota.

Give read-only access where the server owns the writes — `subscriptions` and
`usage_counters` are the existing examples.

## Verify it

```
pnpm db:reset          # re-applies every migration from scratch
pnpm db:test:rls       # isolation assertions must all match their labels
pnpm db:types          # regenerate; never hand-edit database.types.ts
```

If the change affects ownership, add assertions to `supabase/tests/rls.sql`
covering the new table: a second owner must see zero rows, and so must anon.

## Ship it

```
pnpm db:push           # applies to the hosted project
```

Commit the migration, the regenerated types and any test additions together.
