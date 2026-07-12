/**
 * The minimal product footer (M7 Phase 3D-1, task A.2) — one quiet line:
 * the educational-purpose note, "Not financial advice," and (only where the
 * caller has one) a calculation version. `calculationVersion` is optional
 * because the shell renders on the Simulator too, before any simulation
 * exists to have a version — the sentence simply ends one clause earlier
 * there rather than showing a placeholder or omitting the footer.
 */
export function AppFooter({ calculationVersion }: { calculationVersion?: string }) {
  return (
    <footer className="border-t border-border-hairline">
      <div className="mx-auto max-w-[1200px] px-6 py-6 sm:px-10">
        <p className="figure text-xs text-ink-muted">
          Investment Time Machine is an educational tool — not financial advice.
          {calculationVersion ? ` Calculation ${calculationVersion}.` : ''}
        </p>
      </div>
    </footer>
  );
}
