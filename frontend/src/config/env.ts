import { z } from 'zod';

/**
 * Validated at module load, matching the backend's own fail-fast Settings
 * pattern (`.claude/CODING_STANDARDS.md` Core Configuration Layer) — a
 * misconfigured API URL should break the build/boot, not surface as a
 * mysterious runtime network error later.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url(),
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
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
