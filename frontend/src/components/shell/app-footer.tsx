import { SHELL_CONTAINER_CLASS } from './shell-geometry';

/**
 * The minimal product footer (M7 Phase 3D-1, task A.2) — one quiet line:
 * the educational-purpose note, "Not financial advice," and (only where the
 * caller has one) a calculation version. `calculationVersion` is optional
 * because the shell renders on the Simulator too, before any simulation
 * exists to have a version — the sentence simply ends one clause earlier
 * there rather than showing a placeholder or omitting the footer.
 *
 * M7 Phase 3D-5 (item 3) adds the builder's GitHub as a second, equally
 * quiet line-end link — muted, text-xs, sitewide by virtue of living here.
 * Same geometry as the header and main column (`SHELL_CONTAINER_CLASS`,
 * item 1).
 */
export function AppFooter({ calculationVersion }: { calculationVersion?: string }) {
  return (
    <footer className="border-t border-border-hairline">
      <div className={`${SHELL_CONTAINER_CLASS} flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 py-6`}>
        <p className="figure text-xs text-ink-muted">
          Investment Time Machine is an educational tool — not financial advice.
          {calculationVersion ? ` Calculation ${calculationVersion}.` : ''}
        </p>
        <a
          href="https://github.com/SamanSP1386"
          target="_blank"
          rel="noopener noreferrer"
          className="figure text-xs text-ink-muted underline decoration-[var(--color-border-hairline-strong)] underline-offset-4 transition-colors duration-[var(--duration-micro)] ease-[var(--ease-standard)] hover:text-ink-secondary"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
