import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * The playground is dev-only tooling, not a product page. The property
 * that actually matters — that it is unreachable in production — is
 * verified here. The complementary case (it renders normally outside
 * production) was verified two other ways during M7 Phase 1.5: a manual
 * `npm run dev` + curl check (HTTP 200, real content), and inspecting the
 * `npm run build` static output directly, which confirmed the prerendered
 * `/dev/playground` HTML is genuinely the not-found page's markup, not the
 * playground's — not repeated here as an automated test, since dynamically
 * re-importing this page module a second time in the same file under a
 * different env hits an unrelated Vitest/React dev-runtime module-caching
 * quirk (`jsxDEV is not a function`), not a bug in the guard itself.
 */
describe('dev playground production guard', () => {
  afterEach(() => {
    vi.resetModules();
    vi.doUnmock('next/navigation');
    vi.unstubAllEnvs();
  });

  it('calls notFound() when NODE_ENV is production, before rendering anything', async () => {
    const notFound = vi.fn(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
    vi.doMock('next/navigation', () => ({ notFound }));
    vi.stubEnv('NODE_ENV', 'production');

    const { default: PlaygroundPage } = await import('@/app/dev/playground/page');
    expect(() => PlaygroundPage()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
