import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The `localhost:8000` development fallback must never mask a missing
 * `NEXT_PUBLIC_API_BASE_URL` in a production build — a misconfigured
 * production deploy should fail fast at module load, not silently boot
 * pointed at localhost. `env.ts` throws at import time, so each case
 * re-imports the module fresh after stubbing env vars (`vi.resetModules()`
 * + `vi.stubEnv()`, the same technique `playground-guard.test.tsx` uses).
 */
describe('config/env production fallback guard', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('throws in production when NEXT_PUBLIC_API_BASE_URL is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);

    await expect(import('@/config/env')).rejects.toThrow('Invalid environment configuration');
  });

  it('falls back to localhost in development when unset', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', undefined);

    const { env } = await import('@/config/env');
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('http://localhost:8000');
  });

  it('throws in production when NEXT_PUBLIC_API_BASE_URL is an invalid URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'not-a-url');

    await expect(import('@/config/env')).rejects.toThrow('Invalid environment configuration');
  });

  it('uses the real value in production when it is validly set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com');

    const { env } = await import('@/config/env');
    expect(env.NEXT_PUBLIC_API_BASE_URL).toBe('https://api.example.com');
  });
});

/**
 * NEXT_PUBLIC_AUTH_ENABLED — a forward-compat flag (KI-039) with no
 * consumer yet (no login UI exists in the frontend). Defaults to disabled
 * so a future auth UI stays hidden on a deployment where cross-site cookies
 * cannot work, without needing every deploy to remember to set it.
 */
describe('config/env NEXT_PUBLIC_AUTH_ENABLED', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('defaults to false when unset', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', undefined);

    const { env } = await import('@/config/env');
    expect(env.NEXT_PUBLIC_AUTH_ENABLED).toBe(false);
  });

  it('parses "true" as enabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', 'true');

    const { env } = await import('@/config/env');
    expect(env.NEXT_PUBLIC_AUTH_ENABLED).toBe(true);
  });

  it('rejects a non-boolean-ish value', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.example.com');
    vi.stubEnv('NEXT_PUBLIC_AUTH_ENABLED', 'yes');

    await expect(import('@/config/env')).rejects.toThrow('Invalid environment configuration');
  });
});
