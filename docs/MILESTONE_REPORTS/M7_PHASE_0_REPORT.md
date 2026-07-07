# M7 Phase 0 Report — Design Foundation & Brand Constitution

**Date**: 2026-07-13 (Phase 0), 2026-07-14 (Phase 0 Follow-up)
**Version**: 0.7.1, 0.7.2
**Status**: Complete

Backfilled historical summary — written after the fact from `docs/DEVLOG.md`'s 2026-07-13/2026-07-14 entries, `docs/CHANGELOG.md`'s `[0.7.1]`/`[0.7.2]` entries, `docs/BRAND_CONSTITUTION.md`, and `docs/FOUNDER_DECISIONS.md`. No work described here was invented for this report — every claim traces to one of those documents.

---

## Objective

Before writing any Next.js/React/Tailwind code, produce the frontend milestone's equivalent of the design-review-then-implement precedent M3 (Simulation Engine) established: pressure-test a proposed frontend design system against the platform's own backend truth, validate it against installed UI/UX design skills, resolve open brand-identity questions, and consolidate everything into one authoritative visual-identity document — `docs/BRAND_CONSTITUTION.md` — before any frontend implementation begins.

## Scope

Documentation only. No `frontend/` directory content, no React components, no Tailwind configuration, no packages installed. `docs/frontend_design_system.md` (the implementation-level design system produced in an earlier pass of this same design review) was left unchanged in content but made explicitly subordinate to the new constitution.

## Features Implemented

None — this phase produced no application code. Its deliverable is `docs/BRAND_CONSTITUTION.md`, the authoritative source of truth for the product's visual identity and brand philosophy from M7 Phase 1 onward, plus (in the Phase 0 Follow-up pass) **Founder Decision 004** in `docs/FOUNDER_DECISIONS.md`, formally numbering the nine brand/scope decisions the constitution's §3 had recorded in its own local notation (FD-004 through FD-012).

## Foundation Work Completed

The review ran in three parts, consolidated into one single-authored standard rather than a concatenation of three review documents:

1. **Re-validation against backend truth and design skills**: the originally proposed design system was cross-checked against this project's own contracts (`docs/api_design.md`, `docs/simulation_formulas.md`, `docs/KNOWN_ISSUES.md`) and against installed design skills (`ui-ux-pro-max`, `design-system`). The cross-check mostly confirmed the existing direction — a generic "fintech" keyword search in the skill's own color/style database defaulted toward glassmorphism and gold/purple, evidence that this brand's Stripe/Linear-style restraint is a deliberate, load-bearing choice rather than a template default — while surfacing genuine gaps: no locked brand mark, an unresolved anonymous-AI-access ambiguity, and the growth-chart persistence gap (KI-021) needing reclassification from "design around it" to "blocking prerequisite" (formalized as FD-008).
2. **Brand identity development**: personality, keywords, typography/color/motion reasoning, signature details (e.g. the Time Axis motif, §5), and a deliberately honest recruiter-style critique of the (at the time nonexistent) frontend.
3. **Consolidation**: all three passes merged into `docs/BRAND_CONSTITUTION.md` as one authored standard — overlapping guidance (e.g. near-duplicate anonymous-AI-access notes) merged into a single statement, and open hedges from the earlier passes resolved decisively rather than left as "needs founder input": the wordmark is typographic, not iconographic (§4); the AI palette is a neutral tint plus a label band, never a dedicated hue (§7); the time-axis motif's horizontal page-transition is adopted as the product's one standard transition (§5, §8).

Nine Founder Decisions were recorded during this pass — FD-004 through FD-012, including a new one added during the review itself, **FD-012 ("Confidence Without Ego")**. These were formally mirrored into `docs/FOUNDER_DECISIONS.md`'s own numbered ledger as **Founder Decision 004** one day later (2026-07-14, the Phase 0 Follow-up pass, 0.7.2) — a documentation-consistency gap the original Phase 0 entry explicitly disclosed rather than left implicit, then closed on the very next pass.

## UX Decisions

Per `docs/BRAND_CONSTITUTION.md`, binding on every later frontend phase:

- **Brand personality**: "a former quant who now teaches" — precise, patient, honest about uncertainty, understated, pedagogical never persuasive (§2).
- **Visual philosophy**: generous whitespace on decision screens, denser on reference screens (a deliberate per-screen choice, §4); exactly three visual weights per screen; a strict 4px vertical rhythm plus the Time Axis as the one recurring horizontal structural anchor.
- **Color**: brand navy for interactive chrome only, a separate validated chart-data palette, a fixed four-hue status vocabulary, and an AI-content tint that is deliberately *not* a new hue — so the AI panel can never visually outrank the Simulation Engine's own output (§7).
- **Typography**: Inter (tabular figures, a correctness requirement not a style preference) plus JetBrains Mono for anything meant to read as a measured artifact (§6).
- **Motion**: communicates confidence/arrival only, never celebration — a +150% and a −40% outcome get the identical reveal treatment, the single hardest-to-violate-by-accident rule in the document (§8).
- **Writing style**: plain, declarative, sentence case, explicitly signed percentages, no exclamation points/emoji/gamified praise anywhere, including inside AI-generated text (§10).

## Trading-Day Guidance Decision

Not applicable — no Simulator UI existed yet at this phase; the trading-day guidance UX decision belongs to M7 Phase 2 (see `M7_PHASE_2_REPORT.md`). This phase's relevant precedent is the brand-level principle it establishes ahead of time: "Honest about uncertainty — a data gap is stated, never smoothed over" (§2) is the exact philosophy Phase 2's trading-day guidance later implements concretely.

## Testing Summary

Not applicable — documentation-only phase, no code to test.

## Accessibility Summary

Not applicable at the implementation level, but `docs/BRAND_CONSTITUTION.md` §11 (Accessibility rules) and its Component Review Checklist (§12) were written during this phase and are binding on every component built from Phase 1 onward: WCAG 2.1 AA minimum app-wide, color never the sole carrier of meaning, full keyboard operability, visible 2px focus rings, 44×44px minimum touch targets, and `prefers-reduced-motion`/`prefers-color-scheme` treated as first-class inputs.

## Performance Summary

Not applicable — no code changed. `.claude/PERFORMANCE_BUDGET.md`'s constraints (this project's $0-10/month infra target) informed some of the brand document's own restraint (e.g., no illustration, no heavy motion), but no measurement was taken or applicable.

## Security Notes

Not applicable — no code or infrastructure changed. The constitution's own principles reinforce existing product-level trust commitments (e.g., the AI panel must never visually imply greater authority than the Simulation Engine's calculated output, §3) but introduce no new technical control.

## Known Issues

None opened. KI-021 (`growth_series`/`disclosed_splits` not persisted) was reclassified in severity/urgency by FD-008 (from an accepted design-around to a blocking Results-screen prerequisite) but not newly created by this phase.

## Lessons Learned

Cross-checking a self-authored design proposal against an independent, keyword-driven design-recommendation tool produced a genuinely useful *negative* result: the tool's default "fintech" match (glassmorphism, gold, purple) is close to the exact aesthetic the brief explicitly rejects, which is stronger evidence for the chosen restrained direction's deliberateness than either self-review alone would have produced. Separately, the useful editorial discipline was resolving each open hedge from the source review passes to one decisive answer (wordmark, AI palette, page-transition motif) rather than preserving "needs founder input" framing wherever a defensible answer was already implied by principles already agreed on — and disclosing, rather than hiding, the one process gap this pass left open (FD-004–012 not yet mirrored into `FOUNDER_DECISIONS.md`'s formal ledger), which made the one-day-later follow-up straightforward to schedule and close.

## Recommended Next Phase

M7 Phase 1 — Frontend Foundation: design tokens, theming, shared providers, the API client, and shared primitive components only, with no product page built until that checkpoint is reviewed. (Executed — see `M7_PHASE_1_REPORT.md`.)
