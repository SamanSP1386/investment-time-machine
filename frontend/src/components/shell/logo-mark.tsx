/**
 * The product's brand mark (M7 Phase 3D-6, final touch pass) — a single,
 * clean logarithmic-spiral path: small hub at the center, widening
 * outward, evoking compounding growth without literally drawing a chart.
 * Founder-selected direction: "the pure spiral" (a plain, closed spiral
 * form, not a checkmark, arrow, or chart glyph — the mark this file
 * replaces conflated "spiral" with an upward tick-and-dot, which is not
 * this shape). Ported as one filled `<path>` (no stroke, no raster) so it
 * scales losslessly from a 16px browser tab to any lockup size.
 *
 * `currentColor` by default so it inherits whatever the caller's `color`
 * resolves to — every real call site sets that explicitly to
 * `text-accent` (the live `--color-accent` token, themed light/dark), the
 * same gold token every other accent usage in this codebase already reads
 * from (`frontend_design_system.md` §16). The standalone favicon
 * (`app/icon.svg`) cannot use a CSS custom property at all (a favicon has
 * no access to the page's cascade) and hard-codes the equivalent literal
 * hex (`#e1af4a`, `--color-accent-dark`'s resolved value) instead — see
 * that file's own comment.
 *
 * Always decorative (`aria-hidden`, no `role`/`aria-label`): every real call
 * site pairs this mark with adjacent visible text that already carries the
 * accessible name (the header's own wordmark, the footer's disclaimer
 * sentence, a page heading) — giving the mark its own accessible name too
 * would announce "Investment Time Machine" twice at every one of them.
 *
 * HARD RULE (founder-directed, final touch pass): this mark never
 * animates, spins, or serves as a loading indicator, anywhere in the
 * product — a static spiral must not be mistakable for a spinner. No call
 * site may add a `transition`/`animation` class or an `animate-spin`
 * utility to this component or its wrapper. See
 * `docs/frontend_design_system.md` §17 for the one-line standing note.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className} fill="currentColor">
      <path d="M17.18 16.06 Q17.16 16.39 17.11 16.56 Q17.06 16.72 16.96 16.87 Q16.86 17.02 16.72 17.14 Q16.57 17.27 16.4 17.35 Q16.22 17.43 16.02 17.47 Q15.82 17.5 15.61 17.48 Q15.4 17.46 15.19 17.38 Q14.98 17.3 14.8 17.16 Q14.61 17.02 14.46 16.83 Q14.31 16.64 14.22 16.4 Q14.12 16.17 14.09 15.9 Q14.07 15.64 14.11 15.37 Q14.15 15.09 14.27 14.83 Q14.4 14.57 14.59 14.34 Q14.79 14.11 15.05 13.93 Q15.31 13.75 15.62 13.64 Q15.94 13.54 16.28 13.52 Q16.63 13.5 16.98 13.58 Q17.34 13.66 17.67 13.84 Q18.01 14.02 18.29 14.29 Q18.58 14.57 18.79 14.93 Q19 15.28 19.11 15.7 Q19.23 16.12 19.22 16.58 Q19.22 17.03 19.08 17.49 Q18.95 17.94 18.69 18.37 Q18.43 18.79 18.04 19.14 Q17.66 19.49 17.18 19.74 Q16.69 19.99 16.13 20.1 Q15.57 20.21 14.98 20.17 Q14.38 20.13 13.8 19.91 Q13.21 19.7 12.68 19.32 Q12.15 18.95 11.72 18.41 Q11.29 17.88 11.01 17.23 Q10.73 16.57 10.63 15.83 Q10.53 15.09 10.64 14.32 Q10.74 13.55 11.07 12.8 Q11.4 12.05 11.94 11.39 Q12.48 10.73 13.2 10.21 Q13.93 9.7 14.81 9.38 Q15.69 9.07 16.67 9.01 Q17.64 8.94 18.64 9.15 Q19.64 9.35 20.59 9.84 Q21.53 10.33 22.35 11.09 Q23.16 11.85 23.77 12.85 Q24.38 13.84 24.71 15.01 L25.04 16.18 M27.51 15.82 Q26.63 12.83 25.83 11.57 Q25.03 10.3 23.96 9.33 Q22.89 8.36 21.65 7.74 Q20.4 7.12 19.09 6.87 Q17.78 6.62 16.49 6.73 Q15.21 6.84 14.04 7.28 Q12.88 7.71 11.91 8.42 Q10.95 9.12 10.24 10.03 Q9.52 10.94 9.1 11.96 Q8.68 12.99 8.55 14.05 Q8.42 15.11 8.58 16.13 Q8.74 17.15 9.15 18.05 Q9.56 18.96 10.18 19.69 Q10.8 20.42 11.56 20.94 Q12.33 21.45 13.17 21.73 Q14.01 22.02 14.87 22.06 Q15.72 22.1 16.53 21.91 Q17.33 21.73 18.03 21.35 Q18.72 20.97 19.27 20.44 Q19.82 19.9 20.19 19.26 Q20.56 18.62 20.74 17.94 Q20.91 17.25 20.9 16.56 Q20.88 15.88 20.69 15.25 Q20.5 14.62 20.16 14.08 Q19.81 13.54 19.35 13.14 Q18.9 12.73 18.37 12.47 Q17.84 12.21 17.28 12.11 Q16.72 12.01 16.17 12.06 Q15.63 12.11 15.13 12.3 Q14.64 12.49 14.24 12.8 Q13.83 13.1 13.53 13.49 Q13.23 13.88 13.06 14.31 Q12.88 14.75 12.83 15.2 Q12.78 15.65 12.86 16.08 Q12.93 16.51 13.11 16.89 Q13.29 17.27 13.55 17.58 Q13.82 17.89 14.14 18.1 Q14.47 18.31 14.83 18.43 Q15.18 18.54 15.54 18.55 Q15.9 18.57 16.24 18.48 Q16.58 18.4 16.87 18.24 Q17.16 18.07 17.38 17.85 Q17.61 17.62 17.76 17.35 Q17.91 17.08 17.98 16.79 Q18.04 16.51 18.03 16.22 L18.02 15.94 Z" />
    </svg>
  );
}
