# CHANGELOG.md

Semantic version history. Never rewrite history — new entries only. See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md).

---

## [0.15.0] — 2026-07-25 — M7 Phase 3D-1: Craft & Coherence

### Added
- `src/components/shell/product-shell.tsx`, `app-header.tsx`, `app-footer.tsx` — the shared product-route shell: a minimal Newsreader wordmark + "Simulator" nav + hairline rule (sticky), a one-line footer (educational-purpose note, "Not financial advice," and the calculation version when one exists), and the **full-bleed elevated atmosphere**, moved here from each page's own content container so it covers the entire viewport at any width with no visible seam. Used by `/simulator` and every `/simulation/[id]` state.
- `src/components/ui/disclosure.tsx` — the one shared disclosure primitive (rotating chevron, 150ms; a one-shot CSS grid-template-rows height/opacity reveal; `inert` while collapsed), replacing five independent native-`<details>` implementations across the app.
- `src/app/icon.svg` — a real favicon (a small monogram echoing the Growth Chart's own endpoint-dot motif, in the brand accent), replacing the default Next.js favicon.
- Dynamic per-simulation `<title>`/description on the Results page ("If you had invested $X in SYMBOL — Investment Time Machine"), via `generateMetadata`.
- Themed `::selection`, a themed scrollbar, and a `-webkit-autofill` override (`globals.css`) — bespoke, static, theme-aware chrome.
- A one-shot skeleton shimmer (`.skeleton-shimmer`, ≤2 passes) replacing Tailwind's infinite `animate-pulse` — a direct FD-018 violation caught and fixed this pass — plus a full `ResultsSkeleton` matching the completed layout's shape for the Results page's pending state.
- `backend/app/ingestion/seed_dev_data.py` — a one-shot operator script seeding the full `dev_seed` fixture (all 7 symbols) with correct display names in one idempotent command, correcting any already-seeded row's stale name/type directly (`get_or_create_asset` only sets these on first creation).
- Four new `dev_seed` fixture symbols (`DevSeedProvider`): KO (dividend payer), PTON (the one deliberately negative-drift, overall-loss symbol), TSLA (a disclosed stock split), QQQ (a second ETF) — plus new `fetch_dividends`/`fetch_splits` capability methods.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-045** (the `ProductShell` full-bleed architecture, the shared `Disclosure` primitive, a real CSS custom-property re-declaration bug found and fixed live, the chart's Y-axis domain/label-position fixes, and the dividend-date/weekend-mismatch fix).
- `docs/frontend_design_system.md` §15–16 — the enforceable Component State System and Accent Discipline rules this pass's own work is documented against.
- New/updated tests: `disclosure.test.tsx`, new `button.test.tsx` cases (reduced-motion spinner omission, press compression), new `growth-chart.test.tsx` cases (decimation target, endpoint label flip, sparse Y-axis), `backend/tests/ingestion/test_providers_dev_seed.py` (11 cases covering every new fixture symbol/capability, including a regression guard for the dividend-date fix).

### Changed
- Every interactive primitive (`Button`, `Input`, `AssetSearchCombobox`, the Simulator's toggle switches) now has an explicit default/hover/focus-visible/active/disabled state, per `docs/frontend_design_system.md` §15.
- Form-validation invalid state and the required-field marker now use a warm, muted tone (`--color-status-serious`/`--input-border-invalid`, `text-ink-muted`) — `--color-status-critical` and the harsh red asterisk are reserved from this pass forward for hard system/API errors only, never routine field validation.
- `ErrorState`'s icon is now neutral (`text-ink-muted`), not `--color-status-critical` red — "no red alarm panels" for a calm, explanatory error voice even on a genuine failure.
- Accent usage tightened app-wide (`docs/frontend_design_system.md` §16): the Why section's three sub-headings, every disclosure's trigger glyph, and The Proof's growth-data table Value column are no longer accent-colored — accent is now scarce, reserved for hero figures, primary interactive chrome (via the existing `--color-primary` remap), and key data marks only.
- The Results hero's kicker reverted from "Investment Time Machine" to "Simulation result" (and the Simulator's from "Investment Time Machine" to "Historical simulation") — the new `AppHeader` wordmark now owns brand identity; repeating it in the page kicker was a duplication this pass's own label-language audit caught, the same class of fix as the Why/Why? duplication from M7 Phase 3D.
- The hero sentence now names the asset by its real display name plus ticker ("Apple Inc. (AAPL)"), fetched via `useAssetDetail`, falling back to the ticker alone until resolved — the italic ticker-only treatment from M7 Phase 3D is removed.
- The Growth Chart's decimation (~150–200 drawn points, disclosed in the caption when it applies), endpoint-label side-flip (long values no longer clip against the chart's edge), sparse hairline-only mono Y-axis ticks, and a redesigned tooltip (dark elevated surface, mono figures, a kicker-style date label, a styled crosshair, a 120ms reduced-motion-safe fade).
- The Growth Chart's Y-axis domain is now explicitly padded around the actual data range (found live: Recharts' `Area` component otherwise defaults to including a zero baseline, wasting up to half the chart's height on a series that never approaches zero) and the invested-amount baseline label now flips sides dynamically so it never collides with the price line (found live on a loss trajectory specifically, where the invested amount is the series' own maximum).
- `docs/setup_guide.md`'s `dev_seed` section — the recommended seeding command, the full 7-symbol table, and the corrected-name/re-seed guidance.

### Fixed
- Tailwind's `animate-pulse` (infinite by default) on `Skeleton` — a direct, previously-unnoticed FD-018 motion-law violation.
- `--focus-ring-color`/`--input-border-focus` silently rendering the base brand navy instead of the elevated accent inside `.itm-elevated` — a genuine CSS custom-property cascade bug (a `var()` reference resolves once, at its own declaration's scope, not dynamically per descendant), found only by a real keyboard-focus screenshot, not by code review or the unit test suite.
- `DevSeedProvider.fetch_dividends` generating ex-dividend dates that could land on a weekend, with no matching price row — making any dividend-reinvestment simulation crossing such a date fail with `MISSING_HISTORICAL_DATA`. Found live, running a real KO simulation.
- The Growth Chart's wasted vertical space and invested-amount label collision (see Changed above).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A. No new attack surface — this pass is presentational/craft work plus a local-development-only fixture data extension (`dev_seed`, already gated to non-production environments). No new input, endpoint, or calculation.

---

## [0.14.0] — 2026-07-25 — M7 Phase 3D: Design Elevation

### Added
- `docs/FOUNDER_DECISIONS.md` **Founder Decision 018** (Motion & Atmosphere Amendment) — amends Founder Decision 017's immediate-render principle to permit a one-shot digits-only figure scramble/settle, one-shot section entrances, an authorized (not yet applied) chart draw-in pattern, and static-only atmosphere, all gated by a test-enforced `prefers-reduced-motion` hard gate, with identical treatment for gains and losses.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-044** (font self-hosting, the elevated token architecture, the scramble hook's design and the jsdom rAF-epoch bug it caught, the deliberate chart-color non-port, and the explicitly excluded "discarded looping background").
- `frontend/src/hooks/use-scramble.ts` — the FD-018 rule 1 scramble/settle hook, mirroring `useSettleIn`'s once-per-mount pattern.
- An "elevated" token namespace (`frontend/src/styles/tokens/primitives.css`) — oklch atmosphere/ink/accent/negative-tint/hairline values ported from the founder-approved mockup — and `.itm-elevated` (`globals.css`), a single scoped class that remaps semantic tokens (background, ink, hairline, primary/accent, button radius) within the Results and Simulator surfaces only.
- Three self-hosted fonts via `next/font/google` (`frontend/src/app/layout.tsx`): Newsreader (display serif), IBM Plex Mono (figures/mono), Public Sans (body) — replacing Inter/JetBrains Mono.
- A shared `.kicker` label class and a `.scramble-figure` glow-transition class (`globals.css`).
- New/updated tests: `frontend/src/__tests__/lib/use-scramble.test.ts`, reduced-motion and gain/loss-parity coverage in `opening-sequence-heading.test.tsx` and `results-sections.test.tsx`, 12 new elevated-palette contrast cases in `contrast.test.ts` (computed directly from oklch, no lossy hex round trip).
- `docs/KNOWN_ISSUES.md` **KI-047** (the mockup source's untracked/mis-pathed status) and **KI-048** (`docs/BRAND_CONSTITUTION.md`/`docs/frontend_design_system.md` now factually superseded for the elevated surfaces, not yet edited).

### Changed
- The Results hero sentence (`opening-sequence-heading.tsx`) now renders as one flowing serif paragraph with mono, scrambling answer figures, replacing the prior stacked-line layout; `aria-label` is unchanged in mechanism (always the final, non-scrambling text).
- Supporting Facts, Why (now a 3-column grid), and The Proof (`results-sections.tsx`) restyled in the mockup's visual language; a restrained negative tint (new `--color-negative-tint` token) applies to Total Return/CAGR stat values only for a loss, never the hero sentence.
- The Growth Chart (`growth-chart.tsx`) gained a gradient area fill, an invested-amount baseline reference line, an endpoint marker with an on-chart value label, and mono axis ticks — the data line itself deliberately stays the existing CVD-validated `--color-chart-portfolio` blue, not the mockup's gold accent (see ADR-044). Decimation, split markers, the tooltip, the accessible table, and the `toChartPlotNumber` boundary are unchanged; that function now has a second, equally-disclosed call site for the new baseline's plot value.
- The Simulator (`simulation-form.tsx`, `simulator/page.tsx`) is now a flat, borderless, editorial layout — no `Card` wrapper, no card-in-card nesting, underline-only text/date inputs, and toggle-switch-styled (visually only) dividend/inflation checkboxes. Behavior and validation are unchanged.
- `frontend/src/lib/format/index.ts` now re-exports the previously-internal `isNegativeDecimalString`.

### Fixed
- A latent jsdom testing-environment bug: `requestAnimationFrame`'s callback timestamp argument does not share `performance.now()`'s epoch in this environment, which would have made any rAF-driven animation using that pattern silently never complete under test. Caught by `use-scramble.test.ts`, fixed by re-calling `performance.now()` inside the callback.
- A literal `*/` substring inside a `globals.css` comment prematurely closed the comment block — invisible to `vitest`/`tsc`/`eslint`, but a hard failure under Turbopack's production CSS parser (`npm run build`). Caught only by running the actual CI-parity build (KI-046's standing guardrail).

### Removed
- N/A. `SimulationForm`'s `Card` wrapper is removed from that one call site only — the `Card` primitive itself is unchanged and still used elsewhere (`simulation-result-client.tsx`).

### Deprecated
- N/A.

### Security
- N/A. No new attack surface — this pass is presentational only (fonts, tokens, motion, layout); no new input, endpoint, or calculation. The scramble hook operates exclusively on already-formatted display strings, never a `DecimalString`; the new `toChartPlotNumber` call site is chart-geometry-only, matching ADR-043's existing disclosed-exception shape.

---

## [0.13.0] — 2026-07-24 — M7 Phase 3C-3: Growth Chart, Why, and The Proof

### Added
- `frontend/src/components/simulation-result/growth-chart.tsx` — the Results page's Growth Chart: a single-hue Recharts line (identical treatment for a gain or a loss), quiet axes, split-date markers, and three honest non-crashing states (empty series, single-point series, normal).
- `frontend/src/components/simulation-result/chart-plot-value.ts` — `toChartPlotNumber`, the one disclosed, narrowly-scoped exception to this codebase's "never convert a `DecimalString` to a JS number" rule, used exclusively for Recharts' plotting geometry.
- `frontend/src/hooks/use-asset-detail.ts` — lazy `GET /api/v1/assets/{symbol}` fetch backing The Proof's new "Data source" provenance line, enabled only once the disclosure is opened.
- The Why section's full three-paragraph explanation (price appreciation including shares purchased; dividend contribution; inflation adjustment) and The Proof's expanded Methodology (the `close_price` policy, the 365.25-day CAGR convention), Assumptions (exact-date prices, dividend timing, the CPI as-of lookup), Provenance (data source, calculation version, simulation ID, created timestamp), and an accessible, keyboard-navigable growth-data `<table>` — the chart's text alternative.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-043** (the Growth Chart's implementation choices in full).
- New tests: `growth-chart.test.tsx`, `chart-plot-value.test.ts`, `use-asset-detail.test.tsx`, plus rewritten coverage in `results-sections.test.tsx`.

### Changed
- `frontend/src/components/simulation-result/results-sections.tsx::GrowthOverTime` now renders `GrowthChart` against the real, persisted `growth_series` (Founder Decision 014/KI-021, M7 Phase 3C-2) instead of the prior "not yet available" placeholder.
- `WhyExplanation`'s inflation paragraph is now omitted entirely when `adjust_for_inflation` is false, rather than rendered with filler copy — a direct behavior change from the M7 Phase 3B.2 stub.
- `frontend/vitest.setup.ts` — added a `ResizeObserver` stub and a fixed `getBoundingClientRect` override, required for Recharts to render under jsdom.

### Fixed
- N/A — no defect fixed this pass; a planned feature completed.

### Removed
- N/A.

### Deprecated
- N/A. The dividend paragraph's originally-specified third state ("this asset paid no dividends in this range") is a disclosed, deliberate scope decision, not implemented — `SimulationResponse` exposes no dividend-event signal, and deriving one would require frontend-side financial arithmetic this codebase's guardrails (ADR-029/033) forbid. See ADR-043.

### Security
- N/A. No new attack surface — the chart and new sections render only data already returned elsewhere by the API; `useAssetDetail` calls an existing, unauthenticated, already-implemented endpoint. The one numeric-coercion exception (`toChartPlotNumber`) is scoped to chart pixel geometry only, verified never to influence a displayed figure, comparison, or calculation.

---

## [0.12.0] — 2026-07-23 — Growth Series Persistence (Founder Decision 014) + KI-016 Verification

### Added
- `backend/alembic/versions/0005_growth_series_persistence.py` — nullable `simulations.growth_series` JSONB column (schema-only).
- `backend/app/simulation/growth_series_codec.py` — `serialize_growth_series`/`deserialize_growth_series`, the Decimal-safe (string-valued, never a JSON number) storage encoding shared by the write and read paths.
- `backend/app/simulation/backfill_growth_series.py` — one-time operator script (`python -m app.simulation.backfill_growth_series [--dry-run]`) that re-runs `calculate_growth_series` against each pre-existing completed simulation's own stored inputs and stamps the result onto that row's own `calculation_version`; skips and reports (never fails the run) a row whose underlying price/dividend data can no longer support a recompute.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-042** (growth series persistence — column/serialization/backfill engineering record).
- `backend/tests/simulation/test_growth_series_codec.py`, `backend/tests/simulation/test_backfill_growth_series.py`, plus a `make_split` fixture helper in `backend/tests/simulation/conftest.py`.
- A create-then-`GET` round-trip test asserting `growth_series`/`disclosed_splits` are byte-identical between `POST` and a subsequent `GET` (`backend/tests/api/test_simulations.py`) — the literal closing condition for Founder Decision 014 clause 4.

### Changed
- `backend/app/models/simulation.py::Simulation.growth_series` — new column, `JSONB(none_as_null=True)` so an explicit `None` assignment always writes real SQL NULL, never a JSON `null` literal.
- `backend/app/simulation/engine.py::run_simulation` — persists the computed `growth_series` onto the `Simulation` row at creation for completed simulations only; the `POST` response shape is unchanged.
- `backend/app/api/v1/services/simulation_service.py::get_simulation_by_id` — now also returns `disclosed_splits` (re-queried fresh from `stock_splits` on every call, no new column) and `growth_series` (deserialized from the persisted column, never recomputed).
- `backend/app/api/v1/routers/simulations.py::get_simulation` — passes both fields through to `SimulationResponse.from_simulation`, closing the gap where a `GET` previously always returned them empty.
- `docs/KNOWN_ISSUES.md` **KI-021** — status Open → **Resolved**.
- `docs/KNOWN_ISSUES.md` **KI-016** — status Partially Verified → **Resolved**, with the observed AAPL split-date price numbers recorded.

### Fixed
- KI-021: `GET /api/v1/simulations/{id}` no longer returns an empty `growth_series`/`disclosed_splits` for a completed simulation — both now read-through from real, persisted/queryable data, live-verified against the running API.
- A latent JSONB correctness bug found while testing the backfill script: assigning Python `None` to a `JSONB` column without `none_as_null=True` writes the JSON literal `null`, not SQL `NULL`, silently breaking `IS NULL` filters against it.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A. `growth_series`/`disclosed_splits` persistence serves data the engine already computed and already served on `POST` — no new computation, input, or exposure. The backfill script has no HTTP surface. The KI-016 verification's direct-endpoint fetch was a read-only, unauthenticated GET against Yahoo Finance's own public chart data endpoint.

---

## [0.11.0] — 2026-07-22 — CAGR Percentage Scale Correction + Opening Sequence Ruling

### Added
- `backend/alembic/versions/0004_cagr_percentage_v2_backfill.py` — one-time, idempotent data migration rescaling every existing `completed`, `calculation_version = "v1"` simulation's stored `cagr_percentage` by exactly ×100 and re-stamping it to `"v2"`, with a logged, non-destructive carve-out for any row a lossless rescale would overflow `NUMERIC(10,6)` on (none matched against this platform's real data).
- `frontend/src/hooks/use-settle-in.ts` — a minimal, single-boolean entrance-transition hook (replaces `use-opening-sequence.ts`'s multi-phase state machine), captured once at mount, `requestAnimationFrame`-paired, reduced-motion-aware.
- `docs/simulation_formulas.md` §4a — `calculation_version` "v1" (raw fraction) vs. "v2" (percentage) semantics for `cagr_percentage`.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-040** (CAGR percentage-scale fix engineering record) and **ADR-041** (removing the staged opening-sequence timeline).
- `docs/FOUNDER_DECISIONS.md` **Founder Decision 017** (Results Opening Sequence: staged reveal rejected, editorial components kept).

### Changed
- `backend/app/simulation/formulas.py::calculate_cagr` now multiplies by `Decimal(100)`, matching `calculate_total_return_percent`'s existing percentage convention.
- `backend/app/simulation/engine.py::DEFAULT_CALCULATION_VERSION` bumped `"v1"` → `"v2"`.
- `docs/api_design.md`'s `POST /api/v1/simulations` worked example corrected: `"cagr_percentage": "9.594448"` (was the internally-inconsistent `"9.596872"`), `"calculation_version": "v2"`.
- `frontend/src/components/simulation-result/opening-sequence-heading.tsx` — renders the worked-example sentence and every child section immediately on mount; the only motion is a single ~200ms ease-in opacity/translate settle on the sentence via `useSettleIn`, fully disabled under `prefers-reduced-motion`.
- `frontend/src/components/simulator/simulation-form.tsx` — post-submit navigation no longer appends `?new=1`; every completed or failed simulation navigates to the same plain `/simulation/{id}` URL.
- `frontend/src/app/simulation/[id]/page.tsx` — the `<Suspense>` boundary is removed; nothing under `SimulationResultClient` calls `useSearchParams()` anymore.
- `docs/FOUNDER_DECISIONS.md` **Founder Decision 016** — status Proposed → **Approved** (Option 1a); the two accidentally-duplicated draft entries consolidated into one.
- `docs/ARCHITECTURE_DECISIONS.md` **ADR-038** — Status: Accepted → **Superseded by ADR-041**.
- `docs/KNOWN_ISSUES.md` **KI-045** — status Open → **Resolved**.

### Fixed
- The CAGR percentage-scale defect (KI-045): every `completed` simulation's `cagr_percentage` was under-reporting the annualized return by a factor of exactly 100. Live-verified: a seeded AAPL simulation reproducing the originally-cited scenario now shows `+14.69% CAGR` alongside `+73.05% Total Return` (was `+0.15%`).
- Two `backend/tests/simulation/test_formulas.py` unit-test assertions that had been certifying the raw-fraction (pre-fix) `calculate_cagr` output as correct.

### Removed
- `frontend/src/hooks/use-opening-sequence.ts` (the `composing`/`paused`/`answered`/`settled` phase machine) and its test file — replaced by `use-settle-in.ts`.
- `frontend/src/hooks/use-just-created-flag.ts` and its `?new=1` query-marker mechanism, and its test file — no longer serves any purpose with the staged timeline gone.
- `frontend/src/app/dev/opening-sequence-preview/` — the temporary dev-only preview route; nothing left worth a dedicated multi-second-timeline preview harness.
- The "Skip" affordance on the Results page hero — there is no longer a timeline to skip.

### Deprecated
- N/A.

### Security
- N/A. The CAGR fix is a pure calculation-scale correction to an already-served field, with no new endpoint or input. The backfill migration is a scoped, logged, non-destructive data-only `UPDATE`. Removing the `?new=1` marker narrows attack surface trivially (one fewer URL parameter, one fewer `useSearchParams` call site) rather than adding any.

---

## [Unreleased] — 2026-07-21 — Review, Fix-Investigation, Philosophy Audit & Reconciliation Pass

No version bump — this entry documents a review pass, not a release. `v0.10.0` remains the current tagged version at the time this entry was written; see `[0.11.0]` above for the pass that resolved the two items this entry left open.

### Added
- `docs/KNOWN_ISSUES.md` **KI-045** (High) — `cagr_percentage` served at 1/100th its correct value across the Simulation Engine, its own known-answer test, `docs/api_design.md`'s worked example, and the frontend display layer. Root-caused end to end; no code fix yet.
- `docs/FOUNDER_DECISIONS.md` **Founder Decision 016** (Proposed) — three fix options for KI-045 (source/API-boundary/frontend-only), with a recommendation, awaiting founder sign-off.
- Annotated git tag **`v0.10.0`** on commit `15474d3`, closing a drift where `docs/CHANGELOG.md`/`docs/PROJECT_STATE.md` had documented the M7 Phase 3B version since 2026-07-19 but no tag had ever been created.
- Branch **`results/pending-founder-review`** (pushed to origin) — the full, tested, independently-green Results Opening Sequence (M7 Phase 3B.1) and Results Reading Experience (M7 Phase 3B.2) changeset, committed as 5 logical commits, parked pending founder resolution of KI-045/Founder Decision 016 and a motion-philosophy review finding (see below). Not merged to `main`.

### Changed
- `docs/PROJECT_STATE.md` — Current Milestone, roadmap table, Open Founder Decisions, and Critical Known Issues rewritten to reflect actual `main` state versus what exists only on the parked branch.

### Fixed
- N/A — the CAGR defect (KI-045) is documented, not yet fixed; no code changed on `main` this pass.

### Removed
- N/A — nothing deleted. The uncommitted Results-redesign work was parked (preserved on a pushed branch), not discarded.

### Deprecated
- N/A.

### Security
- N/A — documentation, a git tag, and branch/commit reorganization only.

---

## [0.10.2] — 2026-07-20 — M7 Phase 3B.2: Results Reading Experience

### Added
- **The Results Reading Experience** — a full redesign of the completed-simulation Results screen from a KPI-card dashboard to a fixed-order editorial composition (`docs/ARCHITECTURE_DECISIONS.md` ADR-039): Section 1 (a tiny "Simulation result" kicker, nothing more — the status `Badge` is removed), Section 2 (the worked-example sentence — now `OpeningSequenceHeading`'s sole content, redesigned as stacked, editorial lines with the two key figures — investment amount and final value — at a large "Hero Figure" size, the rest of the sentence at a supporting size; no card, no border, no color, no status chip), Section 3 (pure whitespace between the sentence and what follows — a real gap, not a component), Section 4 ("Supporting Facts" — Final Value/Total Return/Annual Return, plain label-value pairs with a native source disclosure, never a bordered tile), Section 5 ("Growth Over Time" — an honest, plainly-stated "not yet available" note, since `growth_series` is always empty today per KI-021; structured so a real chart can slot in later without a redesign), Section 6 ("Why" — three static, non-AI, plain-English paragraphs personalized to the simulation's own values: price appreciation always; dividend contribution and inflation adjustment each stating what was actually chosen, an assumption stated plainly rather than silently applied either way), Section 7 ("The Proof" — one collapsed-by-default disclosure folding in the former "Simulation Snapshot" and "Technical Details" cards as "Assumptions" and "Technical details" subsections, plus new methodology copy referencing the `close_price` basis).
- `frontend/src/components/simulation-result/results-sections.tsx` — `SupportingFacts`, `GrowthOverTime`, `WhyExplanation`, `TheProof`, the four new presentational components backing Sections 4–7.
- 21 new frontend tests (`results-sections.test.tsx` covering every conditional copy branch; updates to `opening-sequence-heading.test.tsx` and `simulation-result-client.test.tsx` for the new markup).

### Changed
- `OpeningSequenceHeading` — completely restyled while its animation/replay logic (`useOpeningSequence`, `useJustCreatedFlag`, `useReducedMotion`, the `?new=1` marker) is unchanged from M7 Phase 3B.1; only what the settled and composing states *look like* changed, not when or whether they play.
- `SimulationResultClient`'s `completed` branch now renders `SupportingFacts`/`GrowthOverTime`/`WhyExplanation`/`TheProof` instead of a `StatTile` grid, a `SimulationSnapshot` card, and a `TechnicalDetails` card. The `pending`/`failed` branches are unchanged — this redesign is scoped to the completed, "what actually happened" case the new reading order describes; `ResultHeader`, `SimulationSnapshot`, and `TechnicalDetails` remain in place, serving those two states exactly as before.

### Fixed
- A real accessibility regression caught only by the test suite, not by visual inspection: the redesign's first draft wrapped the "Skip" button inside the same `aria-hidden="true"` container as the decorative composing animation, making it unreachable by role/keyboard — moved outside that boundary so it remains a real, focusable, announced control.

### Removed
- `StatTile`'s bordered three-tile hero-number row, the bordered "Simulation Snapshot" card, and the separately-bordered "Technical Details" disclosure — all folded into or replaced by the new editorial sections above. `StatTile` itself is untouched and still used elsewhere (e.g. `dev/playground`).

### Deprecated
- N/A.

### Security
- N/A — a pure visual/structural redesign of an existing read-only screen; no new data fetched, no new endpoint, no change to what information is shown for a given simulation.

---

## [0.10.1] — 2026-07-20 — M7 Phase 3B.1: Results Opening Sequence

### Added
- **The Results Opening Sequence** — the calm, one-time animated bridge between the Simulator and a freshly-completed simulation's Results screen (`frontend/src/components/simulation-result/opening-sequence-heading.tsx`), replacing the static "Simulation Result" heading for the `completed` case only. Phrases (asset, amount, dates) compose in one at a time, a silent ~1s pause, then the answer ("…your investment would be worth $X.") arrives calmly with a larger figure size — never a count-up, celebration, or sign-dependent treatment — before settling into the permanent page `<h1>`, at which point the rest of the completed Results screen (hero numbers, snapshot, technical details, links — all pre-existing M7 Phase 3B content, unchanged) mounts beneath it.
- `useOpeningSequence` (`frontend/src/hooks/use-opening-sequence.ts`) — the timeline state machine (`composing` → `paused` → `answered` → `settled`), plus a `skip()` escape hatch that jumps straight to the settled end state.
- `useJustCreatedFlag` (`frontend/src/hooks/use-just-created-flag.ts`) — reads and immediately strips a one-shot `?new=1` URL marker, the "play exactly once" mechanism (see `docs/ARCHITECTURE_DECISIONS.md` ADR-038 for why a query marker was chosen over `sessionStorage`).
- `useReducedMotion` (`frontend/src/hooks/use-reduced-motion.ts`) — JS-level `prefers-reduced-motion` detection for the sequence's `setTimeout`-scheduled timeline, which the project's existing global CSS reduced-motion override cannot collapse (that override only zeroes `animation`/`transition-duration`, not a JS-scheduled delay).
- `SimulationForm` now navigates to `/simulation/{id}` on a successful submission (`?new=1` appended only when the resulting simulation is `completed`) instead of rendering its own inline "Simulation complete" success card, which is removed along with its now-unreachable "Start a new simulation" reset flow.
- The one real `<h1>` on the Results screen carries its final sentence (including the emphasized answer figure) from first render, visually hidden (`sr-only`) until the sequence settles — screen readers get the complete answer immediately, never only via the decorative animation, per `docs/EXPERIENCE_CONSTITUTION.md` §9.
- A visible "Skip" affordance (keyboard-reachable, no focus trap) jumps directly to the settled state with no information loss; `prefers-reduced-motion` does the same automatically.
- 24 new frontend tests (`use-opening-sequence.test.tsx`, `use-just-created-flag.test.tsx`, `opening-sequence-heading.test.tsx`), plus updates to `simulation-form.test.tsx` and `simulation-result-client.test.tsx` for the new navigation/heading behavior.

### Changed
- `frontend/src/app/simulation/[id]/page.tsx` now wraps `SimulationResultClient` in a `<Suspense>` boundary — required by Next.js for any client component calling `useSearchParams` (the opening sequence's marker read) to build for production.
- The pending/failed worked-example sentence (`ResultHeader`/`workedExampleSentence`, unchanged for those two states) no longer has a `completed` branch — a completed simulation's sentence is now owned entirely by `OpeningSequenceHeading`.

### Fixed
- A real layout bug found only by live-rendering in a browser (not caught by the jsdom-based test suite): the decorative composing phrases used `inline-block` spans with trailing whitespace baked into their text content, which browsers trim at an `inline-block` box's edge — words ran together ("invested$10,000.00in AAPL"). Fixed by moving the space to a separate plain text node between spans (`docs/ARCHITECTURE_DECISIONS.md` ADR-038's companion fix, verified via a headless-Chromium screenshot before and after).

### Removed
- `SimulationForm`'s inline post-submit success card and its `formKey`-remount "Start a new simulation" reset flow — both unreachable now that a successful submission navigates away immediately.

### Deprecated
- N/A.

### Security
- N/A — the `?new=1` marker changes only whether an animation plays, never what data is fetched, shown, or fetched from; see ADR-038's Tradeoffs for the (accepted, low-severity) case of a copy-pasted marker.

---

## [0.10.0] — 2026-07-19 — M7 Phase 3B: Founder Decisions + Results Foundation

### Added
- **`/simulation/[id]`** — the frontend's first dynamic route, the Results screen's foundation (no growth chart, AI panel, or methodology section yet, per explicit scope). Server component shell (`frontend/src/app/simulation/[id]/page.tsx`) + one client boundary (`SimulationResultClient`), mirroring the Simulator's page/client split.
- `useSimulation(id)` React Query hook (`frontend/src/hooks/use-simulation.ts`), wrapping the pre-existing but previously-unwired `getSimulation` endpoint function.
- Status-aware rendering for all three `SimulationStatus` values: `completed` (hero `StatTile`s for Final Value/Total Return/CAGR, each with a `source` formula string), `pending` (a calm processing card with a manual "Check again" refetch action), `failed` (the existing `error_message`, rendered via `ErrorState`).
- A worked-example sentence ("If you had invested $X in SYMBOL, starting DATE and held until DATE — here's precisely what would have happened…") whose closing clause adapts to `status`, per `docs/EXPERIENCE_CONSTITUTION.md` §4.
- A Simulation Snapshot card (every input the user chose, never a result) and a collapsed Technical Details disclosure (simulation ID, `calculation_version`, created timestamp).
- "Run another simulation" link and a client-side "Copy link" affordance (`navigator.clipboard`, nothing sent anywhere).
- `StatTile` gained an opt-in `size?: 'default' | 'compact'` prop (default unchanged) for a genuine multi-tile row, plus `break-words`/`min-w-0` as a defensive overflow floor — fixes a real layout defect found by live-rendering the new page (`docs/ARCHITECTURE_DECISIONS.md` ADR-037).
- Backend: `calculation_version` exposed on `SimulationResponse` (`POST` and `GET` identically) — was already stored on every `Simulation` row, never previously surfaced (ADR-036).
- `docs/FOUNDER_DECISIONS.md`: Founder Decision 013 (Experience Philosophy, formalizing `docs/EXPERIENCE_CONSTITUTION.md`), Founder Decision 014 (Growth Series Persistence, Option A — approved, not yet implemented), Founder Decision 015 (Anonymous Educational AI Limits, Option D — approved, not yet implemented).
- 15 new/updated frontend tests (`use-simulation.test.tsx`, `simulation-result-client.test.tsx`, `simulation-result-page.test.tsx`) and 2 new backend assertions (`test_simulations.py`).

### Changed
- `docs/EXPERIENCE_CONSTITUTION.md`: status flipped from PROPOSED to APPROVED (Founder Decision 013).
- `docs/KNOWN_ISSUES.md` KI-021: reopened from "Resolved — partially" to "Open" now that Founder Decision 014 has approved a full-resolution mechanism not yet implemented — was at risk of being mistaken for closed.
- `frontend/src/lib/api/endpoints/simulations.ts::getSimulation` now accepts an optional `AbortSignal`, matching every other GET endpoint's cancellation convention.

### Fixed
- N/A — the `StatTile` overflow (above) is new-in-this-pass code, not a regression of previously-shipped behavior.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — the Results page is a read-only `GET` against an endpoint whose anonymous/ownership access rules already existed (Founder Decision 002); `calculation_version` is a non-sensitive string; the clipboard affordance is same-origin and sends no data anywhere.

---

## [0.9.3] — 2026-07-18 — M7 Phase 2 Final Polish & Closure

### Added
- **Asset information panel** (`SimulationForm`): once an asset is selected, a compact panel shows symbol, name, asset type, and the historical data availability range — every field sourced from data already fetched for the form (the search result itself, plus the existing availability query), nothing new requested and nothing calculated. `exchange` deliberately omitted (not part of `AssetSummary`, and always `null` today per KI-025 — not worth a second request for a field with no value to show).
- **Trust indicators** (`/simulator` page heading): four understated, factual labels — "Deterministic simulation," "Historical market data," "No predictions," "Educational platform" — rendered as plain muted text with a small check icon, explicitly not `Badge` (which is colored from the status palette and would read as a marketing claim, not a calm restatement of fact).
- **"Technical details" progressive disclosure** (`ErrorState`, a shared primitive used by the Simulator, the route-level error boundary, and the dev playground): a new `errorCode` prop; Request ID and error code are now collapsed behind a closed-by-default `<details>`/`<summary>` disclosure rather than an always-visible line — the same native, zero-JS pattern `StatTile`'s source disclosure already established. Nothing was removed, only made progressive.
- 8 new/updated tests covering the asset information panel, the collapsed technical-details disclosure (on both `ErrorState` directly and through `SimulationForm`), and the trust indicators.

### Changed
- Success state copy (`SimulationForm`): "Simulation created" → **"Simulation complete"**; description → "Your historical investment simulation has been successfully created and recorded." — calmer, no change in what information is shown, no celebratory language added (`docs/BRAND_CONSTITUTION.md` §2/§10).
- `selectedAsset`'s `asset_type` in the new panel renders via the same `uppercase` CSS convention `AssetSearchCombobox` already uses for the identical field, for visual consistency between the two.

### Fixed
- N/A.

### Removed
- N/A — Request ID/error code are still shown, only behind progressive disclosure rather than always visible.

### Deprecated
- N/A.

### Security
- N/A — pure UI/copy changes; `ErrorState`'s new `errorCode` prop surfaces the same `ApiErrorCode` value already present on every thrown `ApiError`, not new information.

---

## [0.9.2] — 2026-07-18 — M7 Phase 2 Final UX Polish: Trading-Day Guidance + Educational Error Copy

### Added
- Calm, educational trading-day guidance text in `SimulationForm` (`frontend/src/components/simulator/simulation-form.tsx`), directly under the start/end date inputs: explains that stocks and ETFs have no price data on weekends or market holidays, encourages (never enforces) choosing a trading day, and states plainly that Investment Time Machine never moves a user's dates automatically, since historical accuracy matters more than convenience. Purely informational — no date adjustment, trading-calendar calculation, or nearest-trading-day guessing was added anywhere; the backend's existing `MISSING_HISTORICAL_DATA` rejection behavior is unchanged.
- Two new/updated tests in `simulation-form.test.tsx` covering the new guidance text and the updated error copy.

### Changed
- `ERROR_COPY.MISSING_HISTORICAL_DATA` (`frontend/src/lib/api/errors.ts`): copy rewritten from a terse "This asset doesn't have price data for the selected date range" to an educational explanation — "Stocks and ETFs often do not have historical price data on weekends or market holidays. Please choose different dates and try again." — matching this product's standing rule that every error states cause and remedy in plain, calm language (`docs/BRAND_CONSTITUTION.md` §9) and never implies the backend itself failed.

### Fixed
- N/A.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — pure UI copy/text change, no new input handling, no new data flow.

---

## [0.9.1] — 2026-07-18 — Ingestion Reliability: `dev_seed` Fixture Provider

### Added
- `backend/app/ingestion/providers/dev_seed_provider.py` (`DevSeedProvider`, `--provider dev_seed`) — a small, deterministic, clearly-synthetic local fixture provider (AAPL/SPY/BTC-USD at obviously round, fake price levels) for unblocking manual frontend/Simulator testing when a real provider is unreachable. Goes through the unmodified orchestrator/normalization/validation/repository/audit pipeline (ADR-035). Refuses to construct outside `ENVIRONMENT ∈ {development, test, testing}`, mirroring `Settings`'s existing `JWT_SECRET`/`AI_PROVIDER` production guards. Registered in `app/ingestion/providers/__init__.py` and `app/ingestion/cli.py`'s `--provider` choices.
- `docs/setup_guide.md`: a new section documenting the yfinance rate-limit failure mode, the exact `dev_seed` seeding commands, and explicit rules that `dev_seed` data is development/test only and must never be treated as real provider data.
- ADR-035 (`docs/ARCHITECTURE_DECISIONS.md`).
- KI-044 (`docs/KNOWN_ISSUES.md`) — yfinance 0.2.44's crumb-negotiation endpoint getting rate-limited (429) by Yahoo, breaking all yfinance ingestion identically inside and outside Docker; root-caused via yfinance's own debug mode, not guessed.

### Changed
- N/A — no existing ingestion adapter (`yfinance_provider.py`, `coingecko_provider.py`, `fred_provider.py`), the orchestrator, or validation rules were modified.

### Fixed
- Local manual Simulator testing was blocked by yfinance's rate-limited crumb negotiation; `dev_seed` unblocks it. Note this is a mitigation, not a fix to the underlying cause (KI-044 remains Open, tracking the real fix — a `yfinance` version bump verified against a live, non-rate-limited window).
- A data-hygiene bug found while applying this fix: three pre-existing `Asset` rows (AAPL/SPY/BTC-USD), created by earlier failed `--provider yfinance` attempts and left labeled `data_source="yfinance"` with zero price rows, silently kept that stale label when first reused by `dev_seed` (`get_or_create_asset` only sets `data_source` on creation, never on reuse — `app/ingestion/storage/repository.py:43`). Confirmed no real price data existed under those rows, then deleted them (with explicit sign-off, given the destructive cross-table delete) and re-seeded cleanly. See ADR-035's "Tradeoffs" for the general gap this surfaced.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- `DevSeedProvider`'s environment guard (refuses to construct outside development/test) prevents fabricated data from ever being reachable in a production deployment, even via operator error (e.g. `--provider dev_seed` mistakenly run against a production `ENVIRONMENT`).

---

## [0.9.0] — 2026-07-18 — M7 Phase 2 (increment 1): Punch-List Fixes + Simulator

### Added
- `frontend/src/lib/format/compare-decimal-string.ts` — `compareDecimalStrings`, the one sanctioned way to order two `DecimalString` values (string-only digit comparison, never `Number()`); exported from `src/lib/format/index.ts` and documented in `README.md`. Closes the one financial-math guardrail gap ADR-029 didn't cover (comparison, not just coercion) — ADR-033.
- An ESLint `no-restricted-syntax` selector banning bare `</>/<=/>=` relational operators in product/UI code, alongside ADR-029's existing `Number()`/`parseFloat()`/`parseInt()`/unary-`+` ban (ADR-033).
- `frontend/src/__tests__/lib/theme-tokens.test.ts` — a static regression guard distinguishing `globals.css`'s intentional `@theme inline` namespace-bridging syntax from a genuine self-referencing custom property (ADR-028's actual bug), asserting `semantic.css`/`components.css`/`primitives.css` never contain one.
- `frontend/src/__tests__/lib/breakpoints.test.ts` and a `--breakpoint-*: initial` reset in `globals.css` — locks the Tailwind breakpoint namespace to the three approved tiers (`sm`/`md`/`lg`) so `xl:`/`2xl:` utilities cannot silently exist (ADR-034).
- `frontend/src/hooks/use-simulation.ts` (`useCreateSimulation`) and `frontend/src/hooks/use-asset-availability.ts` (`useAssetAvailability`) — the Simulator's mutation and pre-submit availability-check hooks, following `src/lib/query/README.md`'s established conventions.
- `frontend/src/components/simulator/asset-search-combobox.tsx` — a full ARIA combobox (`role="combobox"` + `role="listbox"`), debounced, backed by `useAssetSearch`, with an informative empty state and central error-copy rendering.
- `frontend/src/components/simulator/simulation-form.tsx` and `frontend/src/app/simulator/page.tsx` — the Simulator screen: asset search, investment amount, start/end date, dividend-reinvestment and inflation-adjustment toggles (behind a "More options" disclosure), full client-side validation (wire schema plus an end-after-start refinement), a pre-submit availability check, and a calm inline success card (simulation ID, status, echoed inputs) with a "Start a new simulation" reset — no navigation to an unbuilt Results page.
- `frontend/src/__tests__/app/global-error.test.tsx`, `frontend/src/__tests__/lib/env.test.ts` — regression tests for A1/A2 below.
- 34 new tests across hooks, the combobox, the form, and the punch-list fixes (144 total, 4 gracefully skipped without a live backend).

### Changed
- `frontend/src/app/global-error.tsx`: the crash-boundary digest color corrected from the old low-contrast `#898781` (already known-bad per ADR-028/KI-037) to the approved `#6b6963`.
- `frontend/src/config/env.ts`: the `localhost:8000` development fallback no longer applies when `NODE_ENV === 'production'` — a production build with a missing/invalid `NEXT_PUBLIC_API_BASE_URL` now fails fast at module load instead of silently booting pointed at localhost.
- `frontend/eslint.config.mjs`: the financial-math guardrail's `files` scope expanded from `src/app/**`/`src/components/**` to also cover `src/hooks/**`, `src/providers/**`, and `src/lib/**`; `src/lib/format/**` added to `ignores` (the one module legitimately allowed to operate on a `DecimalString`'s raw digits, including the comparisons `compareDecimalStrings` is built from).
- `frontend/src/lib/api/client.ts`: `apiClient` now has a 15s request `timeout`.
- `frontend/src/lib/api/endpoints/assets.ts`, `frontend/src/hooks/use-asset-search.ts`: `searchAssets`/`getAssetDetail`/`getAssetAvailability` accept an optional `AbortSignal`; `useAssetSearch` forwards TanStack Query's per-query signal automatically, so a stale in-flight asset search is cancelled the moment a newer keystroke supersedes it.
- `frontend/src/lib/format/decimal-string.ts`: `splitDecimal`/`DecimalParts` exported (previously module-private) so `compare-decimal-string.ts` can reuse the same digit-parsing logic rather than duplicating it.
- `frontend/src/lib/format/README.md`: the "NOT allowed" list amended to state `compareDecimalStrings` as the one sanctioned ordering exception to "never compare"; the enforcement-mechanism section updated to reflect the guardrail's expanded scope.

### Fixed
- KI-043: `AssetSearchCombobox`'s internal display text survived the Simulator's "Start a new simulation" reset (the underlying form value was correctly cleared; the combobox's own uncontrolled text was not) — found during this same phase's post-build review, fixed via a `key`-based remount in `SimulationForm`.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- The production env-fallback fix (`config/env.ts`) closes a real, if narrow, deployment-safety gap: previously, a production build missing `NEXT_PUBLIC_API_BASE_URL` would have silently pointed at `localhost:8000` instead of failing to build — the exact "mysterious runtime network error later" this module's fail-fast design otherwise exists to prevent.

---

## [0.8.1] — 2026-07-16 — M7 Phase 1.5: Frontend Foundation Hardening

### Added
- `frontend/src/lib/format/` — the canonical financial-formatting layer: a branded `DecimalString` type, string-only (never `Number()`/`parseFloat()`/`parseInt()`) currency/percentage/date/date-range formatters, and explicit reason-coded nullable formatters (`formatNullableCurrency`/`formatNullablePercentage`) resolving the long-standing dual-meaning-null problem (`docs/frontend_design_system.md` §14 risk 7). Documented contract in `README.md`.
- `frontend/eslint.config.mjs` — a `no-restricted-syntax` rule banning `Number(`, `parseFloat(`, `parseInt(`, and unary `+` numeric coercion in `src/app/**`/`src/components/**`, enforcing the formatting layer's contract structurally (ADR-029).
- `frontend/src/lib/query/` — TanStack Query conventions fixed before any product page: a query-key factory (`keys.ts`) and a documented error-handling/invalidation convention (`README.md`), demonstrated end-to-end by `frontend/src/hooks/use-asset-search.ts`, a cross-cutting reference hook (ADR-032).
- `frontend/src/app/dev/playground/` — a dev-only visual verification surface rendering every primitive component and variant in both themes, guarded by `notFound()` in production (verified against both the actual compiled static output and an automated test).
- `frontend/src/lib/next-error-boundary.ts` — isolates Next.js's explicitly-unstable `unstable_retry` prop shape behind one shared type (ADR-031).
- `frontend/src/__tests__/lib/api-contract-drift.test.ts` — fetches the backend's live `/openapi.json` and asserts the field names this frontend depends on are present, skipping gracefully when no backend is reachable (ADR-030).
- 61 new tests: a known-answer WCAG contrast test, `axe-core` structural accessibility tests for every primitive, keyboard-operability tests, a reduced-motion mechanism check, format-module tests including a static-analysis guardrail, and query-key/hook tests. 103 tests total, 95%+ statement coverage.
- ADR-028 through ADR-032 (`docs/ARCHITECTURE_DECISIONS.md`).

### Changed
- `frontend/src/styles/tokens/{primitives,semantic}.css`: split muted-ink and all four status colors into verified light/dark pairs (ADR-028) — the original single-shared-hex design failed WCAG AA (4.5:1) as text color in at least one theme for three of four status colors plus muted-ink, and separately contained a self-referencing CSS custom property that would have silently broken Badge's status-color differentiation.
- `frontend/src/types/api.ts`: `GrowthSeriesPoint`/`DisclosedSplit`'s date fields corrected to `point_date`/`split_date` (were wrongly guessed as `date`); six `SimulationResponse` fields corrected to nullable (`DecimalString | null`, were wrongly typed as always-present); added the previously-missing `error_message` field. All financial fields now typed `DecimalString`, not `string`. Confirmed against the real backend schema, both by reading source and via a live, running backend (KI-036/KI-038, ADR-030).
- `docs/frontend_design_system.md` §3: status/muted color table updated to match ADR-028's corrected values.
- `frontend/next.config.ts`: `turbopack.root` pinned explicitly (unrelated build-warning fix noticed in passing).

### Fixed
- A shipped WCAG contrast failure and a self-referencing CSS bug in the status-color design tokens (KI-037, ADR-028) — found before any product page consumed them.
- Real API-contract drift between the frontend's hand-written types and the actual backend response shape (KI-036, KI-038, ADR-030) — found before any product page consumed the affected types.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Verified (not changed): `SameSite` is evaluated by registrable site, not port, so local dev cross-port requests correctly carry session cookies; CORS/cookie configuration matches Founder Decision 002/ADR-018 exactly (`docs/SECURITY_LOG.md`'s M7 Phase 1.5 entry).
- KI-039 added: the production custom-domain requirement `SameSite=Strict` depends on (per ADR-018) is assumed but never enforced or verified anywhere — a real pre-launch blocker if the platform ships on default hosting-provider subdomains.
- KI-040 added: a forward-looking note on the theme-flash-prevention inline script's future CSP interaction (hash-based allow-listing preferred over nonces, to avoid forcing the app into dynamic rendering) — no CSP exists yet.

---

## [0.8.0] — 2026-07-15 — M7 Phase 1: Frontend Foundation

### Added
- `frontend/` — the platform's first frontend code, scaffolded with Next.js 16.2.10 (App Router, TypeScript, Tailwind v4).
- Design token system: `src/styles/tokens/{primitives,semantic,components}.css` (three-layer, runtime-switchable CSS custom properties) bridged into Tailwind v4's `@theme inline` in `globals.css` — covers brand/neutral/chart/status/AI color families, type scale, spacing (Tailwind's default 4px scale, unmodified), radius, elevation, motion durations/easings, and a new six-tier z-index scale.
- Theme system: `src/providers/{theme-provider,theme-script}.tsx` — `data-theme` attribute switching with a synchronous inline `<head>` script (this Next.js version's own documented flash-prevention pattern), a `useTheme()`/`setTheme()` hook, and no rendered toggle yet (deliberate, per `docs/BRAND_CONSTITUTION.md`).
- Shared providers: `src/providers/{query-provider,toast-provider,app-providers}.tsx` (TanStack Query with sensible defaults, a calm toast/notification system, and one composition point), plus `src/app/{error,global-error,not-found}.tsx` (Next 16.2's `unstable_retry`-based error boundaries).
- API layer: `src/lib/api/{client,errors,index}.ts` and `src/lib/api/endpoints/{assets,simulations}.ts` — one Axios instance (`withCredentials: true`), one `apiRequest<T>()` entry point, one pure `normalizeApiError()` function, one `ERROR_COPY` table covering every documented backend error code plus a client-only `NETWORK_ERROR`, and a Zod schema (`simulationCreateSchema`) matching the simulation-creation request contract. `src/types/api.ts` mirrors `docs/api_design.md`/`backend/app/models/enums.py` exactly, keeping every financial figure a `string` end-to-end.
- Eight primitive components (`src/components/ui/`): Button, Input, Card, Badge, Skeleton, EmptyState, ErrorState, StatTile — each reviewed against `docs/BRAND_CONSTITUTION.md`'s Component Review Checklist (hairline-only dividers, icon+label badges, tabular numerals, a keyboard-operable `<details>`-based provenance disclosure on StatTile, `role="alert"`/`aria-invalid`/`aria-describedby` wiring).
- The platform's first frontend test suite: 42 tests across 15 files (Vitest + React Testing Library + jsdom), 94.26% statement coverage — above `.claude/TESTING_GUIDELINES.md`'s 60%+ target.
- ADR-025 through ADR-027 (`docs/ARCHITECTURE_DECISIONS.md`): the token-architecture/Tailwind-v4 bridge, the theme-switching strategy, and the centralized API client design.

### Changed
- `.gitattributes`: explicit LF rules added for frontend source file types (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.mts`, `.cjs`, `.json`, `.css`), resolving KI-010 now that frontend source genuinely exists.
- `docs/PROJECT_STATE.md`: version bumped to 0.8.0; M7 Phase 1 marked complete; Next Milestone updated to M7 Phase 2 (product screens, starting with Simulator → Results).

### Fixed
- N/A (no prior milestone's code was touched; this is new, additive frontend scaffolding only).

### Removed
- The `create-next-app` default placeholder page and unused template SVG assets (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`).

### Deprecated
- N/A.

### Security
- Session handling: `apiClient` sets `withCredentials: true` and never reads, stores, or attaches a token itself — no `localStorage`/`sessionStorage` token handling exists anywhere, by construction (Founder Decision 002's httpOnly-cookie design made a frontend token store unnecessary).
- Exactly one `dangerouslySetInnerHTML` exists (the theme-flash-prevention script), injecting a fixed, source-controlled string with no interpolated user data.
- `frontend/src/config/env.ts` validates its one environment variable with Zod at module load and fails fast on misconfiguration, mirroring the backend's own `Settings` validation philosophy.
- KI-036 added (an inferred, unverified `growth_series` per-point type shape — low severity, data-modeling risk, not a security one).

---

## [0.7.2] — 2026-07-14 — M7 Phase 0 Follow-up: Founder Decision 004 Formalized (Documentation Only)

### Added
- `docs/FOUNDER_DECISIONS.md`: **Founder Decision 004** — consolidates the nine brand/scope decisions from `docs/BRAND_CONSTITUTION.md` §3 (visual design system approval, theme architecture, M7 feature scope exclusions, minimal Account/Settings scope, growth-chart consistency as a backend precondition, anonymous educational AI access and its rate-limit-not-access-gate principle, trust/education over excitement, confidence without ego) into the project's own append-only Founder Decision ledger, following the exact structure of Decisions 001–003. Decisions 001–003 are unchanged.

### Changed
- `docs/PROJECT_STATE.md`: version bumped to 0.7.2; Current Milestone and Open Founder Decisions now cite "Founder Decision 004" directly rather than the constitution's informal `FD-00N` labels.

### Fixed
- Closed the documentation-consistency gap the 0.7.1 entry explicitly disclosed (brand decisions recorded only inside `docs/BRAND_CONSTITUTION.md`, not yet mirrored into `docs/FOUNDER_DECISIONS.md`'s own numbering).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — no code or infrastructure changed.

---

## [0.7.1] — 2026-07-13 — M7 Phase 0: Design Foundation (Documentation Only)

### Added
- `docs/BRAND_CONSTITUTION.md` — the authoritative source of truth for Investment Time Machine's visual identity and brand philosophy: brand philosophy/personality, Founder Decisions FD-004 through FD-012 (including new FD-012, "Confidence Without Ego"), visual/typography/color/motion/UX philosophy, writing style guide, a component review checklist, and an explicit "things we never do" list. Consolidates a three-part M7 Phase 0 design review (initial design system, a skill-validated pressure test using the `ui-ux-pro-max`/`design-system` skills, and a brand-identity deep-dive) into one single-authored standard, superseding those reviews' brand-level conclusions. `docs/frontend_design_system.md` remains the implementation-level design system (tokens, component specs, page inventory) and is now explicitly subordinate to this constitution.

### Changed
- `docs/PROJECT_STATE.md`: version bumped to 0.7.1; M7 Phase 0 marked complete; Next Milestone updated to M7 Phase 1 (design token and shared-primitive implementation only, no pages); FD-004–012 noted under Open Founder Decisions pending formal `FOUNDER_DECISIONS.md` numbering.

### Fixed
- N/A (no application code changed).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- N/A — no code or infrastructure changed; brand/UX guidance reinforces existing product-level trust commitments (e.g., the AI panel must never visually imply greater authority than the Simulation Engine's calculated output) but introduces no new technical control.

---

## [0.7.0] — 2026-07-12 — M6: Educational AI System

### Added
- `app/ai/` — the Educational AI domain module, HTTP/DB-blind (mirrors `app.auth`'s shape): `exceptions.py` (`AIProviderUnavailableError`, `AIOutputStructureError`, `AIIntegrityViolationError`, `AIUnsafeContentError`), `prompt.py` (fixed, versioned system prompts for the Explanation Engine and Financial Tutor — no user text ever concatenated into a system prompt), `safety.py` (three post-generation gates: six-section structure check, numeric-integrity check against the simulation's own structured output, advice-language check), `providers/` (`AIProvider` Protocol mirroring the ingestion milestone's capability-protocol precedent, `AnthropicProvider`, `NullProvider`, a `Settings`-driven factory), `service.py` (`generate_explanation`, `generate_followup_answer` — orchestrates prompt → provider → safety gates → the code-appended Educational Disclaimer).
- Migration `0003_ai_explanation_type`: extends `ai_explanations` with `explanation_type` (`initial`/`follow_up`) and a nullable `question_text`, plus a composite index — no new table, no change to `simulations` or any other domain.
- Three new endpoints: `POST /api/v1/simulations/{id}/explanations` (get-cached-or-generate; `regenerate: true` forces a fresh attempt, capped), `GET /api/v1/simulations/{id}/explanations` (list all attempts), `POST /api/v1/simulations/{id}/explanations/questions` (Financial Tutor follow-up, capped, cached by identical normalized question text).
- `app/api/v1/services/explanation_service.py`: owns the simulation ownership/completion checks (reusing `simulations`' existing access rule), the PII-free `simulation_facts` allowlist construction, caching, regeneration/follow-up caps, and audit logging — the API-layer half of the `app.ai`/`explanation_service` split.
- `app/api/v1/audit.py::record_ai_audit`: one `audit_logs` row per generation attempt, success or failure, using `AuditEventType.AI_EXPLANATION_GENERATED`/`_FAILED` (reserved in the schema since M1, unused until now) — mirrors the existing SAVEPOINT-isolated, fail-open pattern exactly; never includes the generated text, the raw question, or any offending fabricated value.
- `app/api/v1/dependencies.py::rate_limit_ai` — 20/min (Founder Specification Part 2.8.13), reusing the existing Redis-backed `RateLimiter` unchanged.
- `app/core/config.py`: `ai_provider` (default `"none"`), `ai_provider_api_key`, `ai_model_name`, `ai_max_output_tokens`, `ai_request_timeout_seconds`, `rate_limit_ai_per_minute`, `ai_max_explanation_regenerations`, `ai_max_followup_questions`, plus a `model_validator` rejecting a real provider configured with no API key (mirrors ADR-020's `JWT_SECRET` guard).
- 55 new tests: `tests/ai/` (38, no network/DB — safety gates, prompt construction, service orchestration against a fake provider, the Anthropic adapter against a mocked SDK client), `tests/core/test_ai_config.py` (4), `tests/api/test_explanations.py` (17, HTTP-integration against the real DB — cache hits, regeneration/follow-up caps, ownership/completion checks, audit logging, and the safe-fallback path exercised for free via the default `NullProvider`).
- ADR-021 through ADR-024 (`docs/ARCHITECTURE_DECISIONS.md`) and Founder Decision 003 (`docs/FOUNDER_DECISIONS.md`).
- `docs/MILESTONE_REPORTS/M6_REPORT.md`, `docs/PROJECT_STATE.md`.

### Changed
- `requirements.txt`: added `anthropic`.
- `.env.example`: added the eight M6 environment variables listed above.
- `.claude/SECURITY_POLICY.md`: prompt-injection gap note updated — addressed at M6 (structural defense, not just a documented risk); residual heuristic gaps tracked as KI-032.
- `.claude/DATABASE_RULES.md`: `ai_explanations` table description updated to reflect the M6 schema extension.
- `docs/KNOWN_ISSUES.md`: KI-032, KI-033, KI-034 added (heuristic safety-check limitations, a low-severity cap-check TOCTOU race mirroring KI-012/KI-027's precedent, and an unverified provider-model-name caching assumption).

### Fixed
- N/A (no prior milestone code touched beyond the additive wiring noted above; the Simulation Engine was not modified in any way, per direct instruction).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- AI never calculates, modifies, forecasts, recommends, or invents a financial fact — enforced structurally (`app.ai` has no import path to `app.simulation` or any write-capable session), not just by prompt wording.
- Prompt-injection defense: the system prompt is a fixed, source-controlled string for every request; a follow-up question's raw text is placed only inside a clearly delimited data block in the user turn, never merged into the system prompt.
- Privacy: the AI provider never receives email, display name, user ID, IP address, session ID, request ID, or auth information — verified by `_build_simulation_facts`' exhaustive allowlist and a dedicated audit-log test confirming the generated text itself never leaks into `audit_logs.details`.
- AI availability: every generation failure returns a normal, successful HTTP response carrying the literal founder-approved safe message — the simulation itself, and every other endpoint, is entirely unaffected by an AI outage.
- Three residual risks documented, not fully closed, as deliberate tracked debt: KI-032 (heuristic safety checks are not exhaustive), KI-033 (a low-severity cap-check race under genuine concurrency), KI-034 (an unverified provider-echoed-model-name assumption underlying the cache key).

---

## [0.6.0] — 2026-07-11 — M5: Identity Management (Authentication)

### Added
- `app/auth/` — the Identity Management domain module: `exceptions.py` (explicit error taxonomy — `EmailAlreadyRegisteredError`, `WeakPasswordError`, `InvalidCredentialsError`, `AccountLockedError`, `AccountInactiveError`, `InvalidRefreshTokenError`, `RefreshTokenReuseDetectedError`, `InvalidAccessTokenError`), `password.py` (Argon2 hashing, an 8-character minimum floor, timing-parity dummy-hash comparison against account enumeration), `tokens.py` (15-minute JWT access tokens, opaque 256-bit refresh tokens hashed with SHA-256 before storage), `lockout.py` (Redis-backed, per-account failure counter — 5 attempts / 15-minute window, distinct from IP-based rate limiting), `repository.py` and `service.py` (`register_user`, `authenticate`, `refresh_session`, `logout`, `issue_session_for_user` — the sole orchestration entry points).
- `app/models/refresh_token.py` + migration `0002_refresh_tokens`: a new `refresh_tokens` table (opaque-token-hash storage, rotation chain via `replaced_by_id`, `user_agent`/`ip_address` captured for a future multi-device-session feature).
- Four new endpoints: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` — all session state delivered via httpOnly, Secure, `SameSite=Strict` cookies, never in a JSON response body.
- `app/api/v1/dependencies.py`: `get_current_user_optional`, `get_current_user_required`, `get_current_admin_user` — authentication/authorization middleware, re-verifying the user against the database on every request rather than trusting the JWT's `is_admin` claim blindly.
- `app/core/config.py`: a `model_validator` rejecting the default `JWT_SECRET` placeholder outside `development`/`test` environments — a red-team-driven fix, not a design-review item.
- 62 new tests across `tests/auth/`, `tests/api/test_auth.py`, `tests/api/test_dependencies.py`, `tests/core/test_config.py` — unit, DB-integration, and HTTP-integration, including a dedicated refresh-token-reuse multi-device scenario and an HTTP-level account-enumeration-resistance check.
- ADR-017 through ADR-020 (`docs/ARCHITECTURE_DECISIONS.md`) and Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`).
- `docs/MILESTONE_REPORTS/M5_REPORT.md`, `docs/PROJECT_STATE.md`.

### Changed
- `app/api/v1/routers/simulations.py`: `POST /api/v1/simulations` now attaches `user_id` opportunistically when a valid session is present (anonymous creation remains fully supported); `GET /api/v1/simulations/{id}` now enforces real ownership via `get_current_user_optional` instead of M4's fail-closed placeholder.
- `app/api/v1/audit.py`: added `record_auth_audit`, reusing `AuditEventType.USER_REGISTERED`/`USER_LOGIN_SUCCEEDED`/`USER_LOGIN_FAILED`/`USER_LOGOUT` (all already present in the M1 schema, ahead of this milestone).
- `app/api/v1/exception_handlers.py`: seven new exception-to-envelope mappings (`EMAIL_ALREADY_REGISTERED` 409, `WEAK_PASSWORD` 422, `INVALID_CREDENTIALS` 401, `ACCOUNT_LOCKED` 429, `ACCOUNT_INACTIVE` 403, `INVALID_REFRESH_TOKEN` 401, `UNAUTHORIZED` 401).
- `app/models/user.py`: added the `refresh_tokens` relationship.
- `requirements.txt`: added `argon2-cffi`, `pyjwt`, `email-validator`.
- `.claude/SECURITY_POLICY.md`, `.claude/DATABASE_RULES.md`: updated to reflect Founder Decision 002 and the new `refresh_tokens` table.
- `docs/KNOWN_ISSUES.md`: KI-006 resolved, KI-023 updated (middleware now exists; endpoints themselves still deferred), KI-027–KI-031 added.

### Fixed
- N/A (no prior milestone code touched beyond the `simulations.py` router wiring noted above).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Argon2 password hashing (Founder Specification Part 2.8.5), never plaintext, never a hint or security question.
- Account enumeration resistance: login returns the identical status/code/message whether the email is unknown or the password is wrong, verified at both the service layer and the HTTP layer; a wrong password against a suspended account still yields the generic error, never revealing suspension status to an unauthenticated guesser.
- Refresh-token rotation with reuse detection: a replayed, already-rotated token revokes every active session for that user, not just the one presented.
- httpOnly/Secure/SameSite=Strict cookies close off JS-readable token theft (XSS) and cross-site request forgery on the session cookies.
- Fixed during self-review, not just documented: a forgotten `JWT_SECRET` env var in a real deployment would have allowed silent token forgery — now a hard startup failure outside development/test.
- Four residual risks documented, not fixed, as deliberate tracked debt: KI-027 (low-severity concurrent-refresh race), KI-028 (inherent access-token non-revocability window), KI-029 (lockout retry-after not surfaced), KI-031 (password reset itself, deliberately out of scope per direct instruction).

---

## [0.5.1] — 2026-07-10 — M4 Follow-Up: Simulation Audit Logging (KI-026)

### Added
- `app/api/v1/audit.py`: `record_simulation_audit` (writes one `audit_logs` row per `POST /api/v1/simulations` attempt — success, pre-flight validation error, or mid-simulation error — inside a SAVEPOINT, swallowing `SQLAlchemyError` so a broken audit write can never turn a correct response into a 500) and `record_simulation_request_validation_audit` (best-effort audit write for Pydantic-level request validation failures, which never reach the service layer at all).
- 4 new tests (`tests/api/test_simulation_audit.py`): audit row written on success, on `AssetNotFoundError`, on `MissingHistoricalDataError` (asserting the audit row's `entity_id`/`details.simulation_id` match the persisted failed `Simulation` row), and on a Pydantic request-validation failure.

### Changed
- `app/api/v1/services/simulation_service.py::create_simulation`: now records an audit entry on every code path (success, the three pre-flight errors, the two mid-simulation errors); accepts a new required `request_id` keyword argument.
- `app/api/v1/routers/simulations.py`: threads the request's `X-Request-ID` (via `app.core.request_id.get_request_id`) into the service call.
- `app/api/v1/exception_handlers.py`: `RequestValidationError` handler now calls `record_simulation_request_validation_audit`, scoped to `POST /api/v1/simulations` only.
- `docs/KNOWN_ISSUES.md`: KI-026 resolved.

### Fixed
- KI-026: `docs/api_design.md`'s stated audit-logging requirement for `POST /api/v1/simulations` is now implemented (with one documented, deliberate deviation — no new `SIMULATION_FAILED` enum value was added; the existing `SIMULATION_CREATED` value is reused with `status`/`error_code` inside `details`, since adding an enum value requires a migration judged out of scope for this fix).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Every `POST /api/v1/simulations` attempt (success or failure, including requests that fail Pydantic validation before reaching any business logic) now leaves an audit trail — directly serving Founder Specification Part 2.8.14. The audit write is isolated (SAVEPOINT, swallowed `SQLAlchemyError`) so it cannot become a new availability risk for the simulation feature itself.

---

## [0.5.0] — 2026-07-10 — M4: API Layer

### Added
- `app/api/v1/` — the platform's first HTTP API surface: Pydantic schemas (`schemas/common.py` response envelope + Decimal-safe serialization, `schemas/assets.py`, `schemas/simulations.py`), service layer (`services/asset_service.py`, `services/simulation_service.py`), API-layer-only errors (`errors.py`: `SimulationNotFoundError`, `ForbiddenError`, `RateLimitExceededError`), FastAPI dependencies (`dependencies.py`: DB session, rate-limit checks), routers (`routers/assets.py`, `routers/simulations.py`), and `exception_handlers.py` mapping every named exception to the standard `{"success": false, "error": {...}}` envelope with the correct HTTP status.
- Six endpoints: `GET /api/v1/assets` (search), `GET /api/v1/assets/{symbol}` (detail), `GET /api/v1/assets/{symbol}/availability`, `POST /api/v1/simulations` (create, public/anonymous for MVP), `GET /api/v1/simulations/{id}` (retrieve).
- `app/simulation/formulas.py::calculate_growth_series` — extends the Simulation Engine (not the API layer) with Founder Specification Part 3.3.2's required "Growth Chart" output, wired into `SimulationOutcome.growth_series` via a new `SimulationRepository.get_prices_ordered` method.
- `app/core/request_id.py` — per-request UUID middleware (`X-Request-ID` response header, used for error-response correlation without leaking internals to the client).
- `app/core/rate_limit.py` — Redis-backed fixed-window `RateLimiter` (fails open with a logged warning if Redis is unreachable, mirroring the Founder Specification's AI-failure-isolation philosophy applied by analogy); Redis added to `docker-compose.yml`, `Settings`, `.env.example`, `requirements.txt`.
- 26 new tests: 5 pure-formula growth-series tests + 1 DB-integration engine test (`tests/simulation/`), 4 rate-limiter unit tests (`tests/core/test_rate_limit.py`), 7 asset-endpoint and 9 simulation-endpoint integration tests (`tests/api/`, using FastAPI's `TestClient` against the real DB via transaction-rollback fixtures).
- ADR-016 (`docs/ARCHITECTURE_DECISIONS.md`): service-owned transaction boundary, engine-computed growth series, savepoint-nested test sessions.
- `docs/MILESTONE_REPORTS/M4_REPORT.md`.

### Changed
- `app/main.py`: mounts the v1 router under `/api/v1`, registers all exception handlers, adds `RequestIDMiddleware` and CORS middleware. The M0 `/health` endpoint is unchanged and unversioned.
- `app/simulation/exceptions.py`: `SimulationError` base now carries an optional `simulation_id`, populated for `MissingHistoricalDataError`/`CalculationError` (the two error types where a failed `Simulation` row is already persisted before the exception propagates) so the API error response can reference the stored record.
- `pyproject.toml`: added `flake8-bugbear`'s `extend-immutable-calls` for `fastapi.Depends`/`fastapi.Query` (FastAPI's own DI idiom, not the mutable-default-value bug B008 otherwise guards against).
- `docs/api_design.md`, `docs/KNOWN_ISSUES.md` (KI-021 resolved with a documented remaining gap, KI-022/023/024 resolved per explicit founder decision, KI-025/026 added), `docs/FOUNDER_DECISIONS.md` context — see M4 report for the full compliance detail.

### Fixed
- N/A (no prior milestone code touched beyond the `exceptions.py`/`engine.py` extensions noted above).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Rate limiting (60/min simulation creation, 100/min reads) is the MVP-appropriate control for the public, unauthenticated `POST /api/v1/simulations` endpoint, per explicit founder decision (KI-022).
- Every named exception type maps to an explicit, reviewed HTTP status and error code; the one legitimate boundary-level catch-all (`Exception` → 500 `INTERNAL_SERVER_ERROR`) logs full detail server-side and returns only a generic message plus a `request_id` to the client.
- No admin or authentication-requiring endpoints implemented or exposed (Simulation History, Admin Import deferred to M5 per founder decision — KI-023).
- **Known gap, not yet fixed**: `docs/api_design.md`'s stated audit-logging requirement for simulation creation was not implemented in this pass — tracked as KI-026.

---

## [0.4.0] — 2026-07-09 — M3: Simulation Engine

### Added
- `app/simulation/exceptions.py`: explicit error taxonomy (`AssetNotFoundError`, `InvalidDateRangeError`, `InvalidInvestmentAmountError`, `MissingHistoricalDataError`, `CalculationError`), matching Founder Specification Part 2.14.14 exactly.
- `app/simulation/precision.py`: scoped `decimal.localcontext()` (`prec=38`, `ROUND_HALF_EVEN`), currency/percentage quantization helpers.
- `app/simulation/formulas.py`: pure, DB-free calculations — shares purchased, final value, total return %, CAGR, inflation-adjusted value, dividend reinvestment loop — every formula cited to its exact Founder Specification section.
- `app/simulation/repository.py`: read-only Simulation Engine data access (exact-date price lookup, ordered dividend/split retrieval, as-of CPI lookup).
- `app/simulation/engine.py`: `run_simulation` — the sole orchestration entry point (Input Validation → Historical Data Retrieval → Calculation → Result Generation → Storage), implementing Founder Decision 001 (`close_price` primary, `adjusted_close_price` never read, `stock_splits` disclosure-only).
- 36 new tests across `tests/simulation/`: pure-formula known-answer tests (several reproducing the Founder Specification's own worked examples verbatim), Decimal precision/rounding tests, DB-integration known-answer tests, determinism tests, error-handling tests, and split-disclosure tests.
- `docs/FOUNDER_DECISIONS.md` (Founder Decision 001) and ADR-015 (M3 design review turn — already recorded prior to this implementation pass).
- `docs/MILESTONE_REPORTS/M3_REPORT.md`.

### Changed
- `docs/simulation_formulas.md`: status updated to IMPLEMENTED; corrected §2 — dividends are ignored entirely (not tracked as uninvested cash) when `dividends_reinvested = false`, matching Founder Specification 2.14.10/3.3.3 precisely.
- `docs/KNOWN_ISSUES.md`: KI-016 updated (code behavior verified; live-data empirical claim remains open with a documented manual verification runbook), KI-017/018 resolved, KI-019/020 added.

### Fixed
- N/A (no prior milestone code touched).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- No new attack surface (no API endpoints, no user input parsing beyond function arguments). `run_simulation` never executes AI-generated or live-fetched data — only already-validated, already-stored rows (Founder Specification Part 2.14.6).

---

## [0.3.0] — 2026-07-07 — M2: Historical Data Ingestion Pipeline

### Added
- Provider Layer (`app/ingestion/providers/`): `YFinanceProvider` (stocks/ETFs — prices, dividends, splits), `CoinGeckoProvider` (crypto — prices), `FredProvider` (economic indicators — observations). Capability protocols (`PriceProvider`, `DividendProvider`, `SplitProvider`, `IndicatorProvider`) let the orchestrator query what each provider supports rather than assuming a uniform interface.
- Validation Layer (`app/ingestion/validation/`): per-record-type validators returning explicit rejection reasons; in-batch duplicate detection.
- Normalization Layer (`app/ingestion/normalization/`): provider-shaped records → platform-standard dicts (Decimal-typed, upper-cased symbols/currency).
- Storage Layer (`app/ingestion/storage/`): `IngestionRepository` — idempotent upserts (`ON CONFLICT DO NOTHING`) per table, asset/indicator resolution, per-record SAVEPOINT isolation.
- Audit Layer (`app/ingestion/audit/`): one `audit_logs` row per real import attempt (success/failure), never written during a dry run.
- Import Report (`app/ingestion/reports/`): structured, reusable summary (provider, target, row counts, warnings, errors, status, duration) for every import.
- Orchestrator (`app/ingestion/orchestrator.py`): `import_asset_prices`, `import_asset_dividends`, `import_asset_splits`, `import_economic_indicator`, `import_asset` (convenience wrapper) — full dry-run support with no database writes.
- Explicit exception hierarchy (`app/ingestion/exceptions.py`): `ProviderUnavailableError`, `NetworkTimeoutError`, `InvalidSymbolError`, `UnexpectedProviderResponseError`, `DatabaseConstraintError`.
- CLI entrypoint (`app/ingestion/cli.py`) for manually triggering imports — not an API endpoint, no auth, no scheduler.
- Core Configuration Layer addition: `app/core/database.py` (engine/session factory, `session_scope` context manager) — the only place a SQLAlchemy `Engine` is constructed.
- 63 new tests: provider adapters (mocked, no live network calls), validation rules, normalization, Import Report, and DB-integration tests for storage/audit/orchestrator (dry-run, real-run, idempotency, provider-failure handling).
- ADR-011 through ADR-014 (provider capability protocols, CoinGecko OHLC disclosure, per-record SAVEPOINT, single-audit-row-per-import design).

### Changed
- `.env.example`, `backend/app/core/config.py`: added `FRED_API_KEY`, `INGESTION_HTTP_TIMEOUT_SECONDS`.
- `backend/requirements.txt`: added `yfinance`, `httpx`, `requests`.

### Fixed
- N/A.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- All provider data treated as untrusted until validated; no provider adapter has database access (enforced by module boundaries).
- FRED API key sourced from environment only, never logged or hardcoded.
- No raw/string-interpolated SQL anywhere in the ingestion pipeline — all writes go through parameterized SQLAlchemy Core/ORM constructs.
- CoinGecko's OHLC approximation (a data-fidelity limitation of the free API tier) is disclosed via an Import Report warning on every affected import, never silently presented as genuine intraday data.

---

## [0.2.2] — 2026-07-07 — CI Reliability Fix: Stable Secret Scanning

### Added
- N/A.

### Changed
- `.github/workflows/ci.yml`: `secret-scan` job now installs and runs the `gitleaks` CLI directly (`gitleaks detect --source . --redact --verbose`, pinned v8.18.4) instead of `gitleaks/gitleaks-action@v2`, scanning the repository's full git history unconditionally rather than an event-inferred commit range.

### Fixed
- CI `secret-scan` job no longer fails with an ambiguous-commit-range error after a merge or unrelated-history pull. Root cause was the wrapper action's range inference, not a detected secret — see `docs/KNOWN_ISSUES.md` KI-011 (resolved).

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- Secret-scanning coverage unchanged or stronger (full history scan every run, not a diff range). No leak was ever missed by the prior bug — it was a false-positive CI failure.

---

## [0.2.1] — 2026-07-06 — Repository Hygiene Pass

### Added
- `.gitattributes`: LF forced for `.py`/`.md`/`.yml`/`.yaml`/`Dockerfile`/`.sh`; CRLF forced for `.bat`/`.ps1`; explicit `binary` declarations for `.pdf`/`.docx`/common image formats.
- `.editorconfig`: UTF-8, LF, 4-space indentation, required final newline, trailing-whitespace trimming (Markdown exempted for intentional line breaks); CRLF override for `.bat`/`.ps1` to match `.gitattributes`.
- Five hygiene hooks from `pre-commit/pre-commit-hooks` (trailing-whitespace, end-of-file-fixer, mixed-line-ending, check-merge-conflict, check-added-large-files, check-yaml, check-toml).
- ADR-010: rationale for standardizing on LF line endings project-wide.

### Changed
- `.gitignore`: added `.mypy_cache/`, `.coverage.*`, `*.log`, `*.bak`, `*.orig`, `*.rej`.

### Fixed
- N/A — no application behavior changed.

### Removed
- Stray nested `backend/.git/` directory (empty, commit-less, remote-less — confirmed zero history before removal).

### Deprecated
- N/A.

### Security
- `check-added-large-files` pre-commit hook now guards against accidentally committing an oversized binary.
- No secrets, credentials, or application security surface touched by this pass.

---

## [0.2.0] — 2026-07-05 — M1: Database Schema & Migrations

### Added
- SQLAlchemy 2.0 models for all nine Founder Specification database domains (ten tables — `app/models/`): `Asset`, `HistoricalPrice`, `Dividend`, `StockSplit`, `EconomicIndicator`, `EconomicIndicatorValue`, `User`, `Simulation`, `AuditLog`, `AIExplanation`.
- Five native PostgreSQL ENUM types: `asset_type_enum`, `simulation_status_enum`, `ai_generation_status_enum`, `auth_method_enum`, `audit_event_type_enum`.
- Initial Alembic migration (`0001_initial_schema`) creating all enums, tables, constraints, and indexes.
- Shared naming-convention metadata (`idx_<table>_<column>`, `fk_<table>_<referenced_table>`, etc.) enforced automatically via SQLAlchemy's `MetaData(naming_convention=...)`.
- `pg_enum()` helper ensuring native enum labels use lowercase `.value` strings, not Python enum member names.
- 27 tests: 25 metadata-only model tests (no DB required) plus 2 DB-integration tests that apply the real migration to a live Postgres and assert zero drift against the models.
- Postgres service added to CI (`.github/workflows/ci.yml`) so migrations and DB-integration tests run for real on every push/PR.
- Derived ERD (`docs/erd.md`, Mermaid diagram + relationship notes).
- ADR-008 (Economic Indicators design) and ADR-009 (`audit_logs.user_id` delete behavior).

### Changed
- `.claude/DATABASE_RULES.md` updated to reflect the implemented schema rather than open gaps.
- `docs/setup_guide.md` updated with migration commands and a note on the test/dev-database interaction (KI-009).

### Fixed
- Approved fix: `calculation_version` present on `simulations` from migration 1 (not deferred).
- Approved fix: `simulations` and `ai_explanations` output columns are nullable (pending/failed states have no output yet) — corrects a Founder Specification internal inconsistency (NOT NULL columns alongside a status enum permitting no-output states).
- Approved fix: `users.password_hash` nullable with `auth_method` discriminator, for future OAuth support.
- Real bug caught during implementation: SQLAlchemy's `Enum(PyEnum)` defaults to storing the Python enum **member name** (e.g. `"STOCK"`), not `.value` (e.g. `"stock"`) — fixed via the `pg_enum()` helper before it reached a migration.

### Removed
- N/A.

### Deprecated
- N/A.

### Security
- `audit_logs.entity_id` (polymorphic) intentionally has no FK — documented exception, not a precedent.
- `audit_logs.user_id` uses `ON DELETE SET NULL` so the audit trail survives user account deletion (ADR-009).
- `ip_address` (PII) stored on `audit_logs` with no schema-level redaction/retention — flagged as an application-layer responsibility, not solved here.

---

## [0.1.0] — 2026-07-02 — M0: Repository & Environment Foundation

### Added
- FastAPI application skeleton (`app/main.py`) with a `/health` endpoint.
- Core Configuration Layer: centralized `Settings` (pydantic-settings) and startup logging configuration.
- PostgreSQL service via Docker Compose; backend Dockerfile.
- Alembic initialized (no models/migrations yet — infrastructure only).
- pytest smoke test for `/health` (1 test, passing).
- ruff, black, and pytest configuration (`pyproject.toml`).
- pre-commit hooks: ruff, black, gitleaks.
- GitHub Actions CI: lint, format-check, test, secret scan.
- `.env.example`, `.gitignore`, `docs/setup_guide.md`.

### Changed
- N/A (first release).

### Fixed
- N/A (first release).

### Removed
- N/A (first release).

### Deprecated
- N/A.

### Security
- gitleaks secret scanning added to both CI and local pre-commit, active from the first commit.
- No secrets committed; all configuration sourced from environment variables via `Settings`, never read directly from `os.environ` elsewhere in the codebase.
