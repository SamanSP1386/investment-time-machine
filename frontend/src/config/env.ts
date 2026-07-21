import { z } from 'zod';

/**
 * Validated at module load, matching the backend's own fail-fast Settings
 * pattern (`.claude/CODING_STANDARDS.md` Core Configuration Layer) — a
 * misconfigured API URL should break the build/boot, not surface as a
 * mysterious runtime network error later.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
  /**
   * Forward-compat scaffold for a future login/register UI (KI-039):
   * `SameSite=Strict` session cookies never attach across two different
   * registrable domains (e.g. `*.vercel.app` calling `*.onrender.com`), so
   * authentication is expected to be non-functional on this deployment
   * until a shared custom parent domain exists. No login UI is built yet —
   * there is nothing to hide today — but any future auth UI should read
   * this flag and stay hidden/disabled by default rather than shipping
   * broken-looking "sign in" affordances on a deployment where they cannot
   * work. Defaults to disabled; docs/DEPLOYMENT.md documents when to flip it.
   */
  NEXT_PUBLIC_AUTH_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/**
 * The `localhost:8000` fallback exists only to smooth over local
 * development — it must never mask a missing `NEXT_PUBLIC_API_BASE_URL` in
 * a production build. Without this guard, a production deploy that forgot
 * to set the env var would silently boot pointed at localhost instead of
 * failing fast, the exact "mysterious runtime network error later" this
 * module's own fail-fast design is meant to prevent.
 */
const developmentFallback = process.env.NODE_ENV === 'production' ? undefined : 'http://localhost:8000';

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? developmentFallback,
  NEXT_PUBLIC_AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
