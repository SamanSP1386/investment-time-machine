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

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000',
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
