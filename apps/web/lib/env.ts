import { z } from 'zod';

/**
 * Fail at boot with a readable message rather than at runtime with a confusing one.
 * Server-only values are validated lazily so the browser bundle never touches them.
 */

function explain(error: z.ZodError, where: string): never {
  const missing = error.issues.map((issue) => issue.path.join('.')).join(', ');
  throw new Error(
    `Missing or invalid environment variables: ${missing}.\n` +
      `Copy apps/web/.env.example to apps/web/.env.local and fill them in.\n` +
      `(checked in ${where})`,
  );
}

/**
 * A variable declared with no value — common when a deployment platform is
 * seeded from .env.example — arrives as an empty string, which would slip past
 * a required check as "invalid" and defeat .default(). Treat it as absent.
 */
function present(value: string | undefined): string | undefined {
  return value && value.trim() !== '' ? value : undefined;
}

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_APP_URL: z.url().default('http://localhost:3000'),
});

// Next.js inlines NEXT_PUBLIC_* only when referenced statically, so they are listed
// one by one instead of passing process.env wholesale.
const publicParsed = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  NEXT_PUBLIC_APP_URL: present(process.env.NEXT_PUBLIC_APP_URL),
});

export const publicEnv = publicParsed.success
  ? publicParsed.data
  : explain(publicParsed.error, 'apps/web/lib/env.ts');

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
});

let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function serverEnv() {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() was called in the browser');
  }
  if (!cachedServerEnv) {
    const parsed = serverSchema.safeParse({
      SUPABASE_SERVICE_ROLE_KEY: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    });
    cachedServerEnv = parsed.success ? parsed.data : explain(parsed.error, 'serverEnv()');
  }
  return cachedServerEnv;
}
