# Frontend Design System — M7 Phase 0 (Design Review)

**Status: DESIGN REVIEW — pre-implementation. No frontend code, no React components, no files under `frontend/` created or modified by this document.** Written before M7 (Frontend, Next.js) begins, matching this project's established design-review-then-implement pattern (M3/M5/M6 precedent — see `docs/PROJECT_STATE.md`). This document is a design *proposal*; it becomes binding project policy only once the founder approves it, at which point it should be promoted to a Founder Decision the same way the M5 and M6 design reviews were (`docs/FOUNDER_DECISIONS.md`).

Grounded in: `.claude/SYSTEM.md` (four non-negotiable principles, approved tech stack), `.claude/MVP_RULES.md` (scope, personas), `docs/api_design.md` (actual response shapes and error codes), `docs/simulation_formulas.md` (what the Simulation Engine actually computes), `docs/FOUNDER_DECISIONS.md` (001–003), `docs/MILESTONE_REPORTS/M6_REPORT.md` (AI output structure), and `backend/app/models/enums.py` (actual state machines the UI must represent). The `frontend/` directory is currently empty — this document assumes nothing about it beyond the locked stack: **Next.js, TypeScript, Tailwind CSS, Recharts** (`.claude/SYSTEM.md`).

Two standing rules from `.claude/SYSTEM.md` govern every recommendation below and are not up for reinterpretation at the design stage: **"Accuracy over aesthetics"** and **"backend before frontend."** Nothing here proposes the frontend compute, estimate, or reformat a financial figure beyond direct display of what the API returns.

---

## 1. Brand personality

Investment Time Machine is **the calm expert, not the hype machine.** Its three reference personas (college students learning, retail investors researching, researchers/enthusiasts verifying) are all here to *understand* a historical outcome, not to be sold a next trade — there is no next trade to sell; this is explicitly not a brokerage (`.claude/SYSTEM.md`).

Personality traits, in priority order:
- **Precise** — every number on screen has a source (a specific API field) and the UI never implies more certainty than the data supports (mirrors "Historical Truth Is Sacred").
- **Patient** — no urgency, no countdown timers, no "prices are moving now" language. Nothing about this product is time-sensitive; it is retrospective by design.
- **Honest about uncertainty** — a missing CPI observation, an empty growth series, an AI explanation that safely failed: all are stated plainly, never hidden or glossed.
- **Understated confidence** — the platform doesn't need to perform expertise (loud claims, superlatives); the data and the explanation do the work.
- **Pedagogical, not persuasive** — copy teaches ("this is what CAGR means and why it differs from total return"), it never nudges toward an action ("you should have bought more").

Voice and tone: plain declarative sentences, no exclamation points, no emoji, no gamified praise ("Nice gains! 🎉"). A -40% historical outcome and a +150% one are narrated with the same even tone — this is the clearest single tell that separates an education platform from a trading app, and it should be enforced as a copy-review rule, not left to individual screens.

## 2. Visual identity direction

Reference blend: **Stripe's** document-grade clarity and generous whitespace, **Linear's** structural precision and restraint, **Vercel's** developer-grade simplicity (dark mode as a first-class citizen, not an afterthought), **Apple's** calm product presentation (few elements on screen at once, each with room to breathe). The net target is closer to a well-designed research terminal or an audited financial report than a consumer dashboard.

Recurring visual motif: the product's own name — a horizontal **time axis** as a structural element, not just a chart type. The growth chart's x-axis, the simulation history list (chronological), and even the results-screen date range badge should all visually rhyme as "a point in time, read left to right."

Explicitly avoid (per the brief, and reinforced by what the backend actually promises):
- Coins, rockets, candlestick-with-neon-glow, "to the moon" iconography, countdown/urgency banners, confetti or celebration animation on gains (see §9).
- Card-heavy, metric-soup dashboards where twelve tiles compete for attention — every screen should have one clear primary question it answers (see §8's "every chart answers a question," extended here to every screen).
- A "trading terminal" all-dark-mode-only default — the primary persona is a student, plausibly working in a bright classroom or library; dark mode should be a fully realized, equally premium alternative (matching Vercel/Linear precedent), not the default identity of the brand.

## 3. Color palette

Two related but distinct palettes: **UI chrome** (brand, navigation, buttons, surfaces) and **data color** (chart series), kept deliberately separate so a user never has to wonder "is that blue clickable, or is that blue a number." The data palette below is the dataviz skill's validated reference instance (`references/palette.md`) — chosen specifically because it is CVD-validated, contrast-checked, and already spec'd for both light and dark; the brand palette is proposed to sit alongside it without collision.

**Neutrals (shared across UI chrome and chart canvas — deliberately the same tokens, so a chart never looks like a different material than the page around it):**

*Muted's light-mode value was corrected at M7 Phase 1.5 (ADR-028) — the original single shared `#898781` measured 3.41:1 against the light page plane, below WCAG AA's 4.5:1 for text.*

| Role | Light | Dark |
|---|---|---|
| Page plane | `#f9f9f7` | `#0d0d0d` |
| Surface (card/chart) | `#fcfcfb` | `#1a1a19` |
| Primary ink | `#0b0b0b` | `#ffffff` |
| Secondary ink | `#52514e` | `#c3c2b7` |
| Muted (axis/labels/meta) | `#6b6963` | `#898781` |
| Hairline border | `rgba(11,11,11,0.10)` | `rgba(255,255,255,0.10)` |
| Gridline | `#e1e0d9` | `#2c2c2a` |

**Brand primary — "Ledger Navy" (proposed, needs founder sign-off, §"Decisions needed"):** a deep, deliberately desaturated navy (`#1B3A6B` light / `#3E6BB0` dark-mode-adjusted) for interactive chrome — primary buttons, links, active nav state, focus rings. It is intentionally *not* the same blue used for chart data (below), so "blue means clickable" and "blue means the portfolio-value line" never overlap on the same screen.

**Chart categorical palette (from the dataviz skill's validated default — reuse as-is, do not invent new chart hues):**

| Slot | Hue | Light | Dark | Suggested use here |
|---|---|---|---|---|
| 1 | blue | `#2a78d6` | `#3987e5` | Portfolio value (the one series every user sees) |
| 2 | aqua | `#1baf7a` | `#199e70` | Real (inflation-adjusted) value, when shown alongside nominal |
| 6 | red | `#e34948` | `#e66767` | Reserved for the diverging pair (loss/negative territory), never a plain "series 3" |

Slots 3–8 are reserved for future multi-asset/comparison work, not needed at M7's single-asset scope — do not assign them speculatively.

**Status palette (fixed, shared by chart annotations and ordinary UI states — one system, not two):**

**Amended at M7 Phase 1.5 (ADR-028):** the single-hex-per-status design below could not pass WCAG AA (4.5:1) as *text* color against both a near-white and a near-black background simultaneously — a real, shipped contrast bug caught during Phase 1.5's accessibility hardening pass (`frontend/src/__tests__/lib/contrast.test.ts`). Each status now has a light-mode and dark-mode text-safe variant, matching how the chart and neutral palettes already worked. The hue identity (green/amber/orange-red/red) is unchanged — only the exact shade shifts per theme for contrast safety.

| Role | Hex (light) | Hex (dark) | Use |
|---|---|---|---|
| good | `#0b7d0b` | `#0ca30c` | Positive return badges, success toasts |
| warning | `#8a5a00` | `#fab219` | Rate-limit/soft-warning banners |
| serious | `#a8451f` | `#ec835a` | Missing-data / partial-result states |
| critical | `#c23434` | `#e8605f` | Hard errors, validation failures |

Per the dataviz skill's non-negotiables: status color is never the sole carrier of meaning (icon + label always accompany it), and these four hues are never reused as chart series colors.

Before any of this ships, run `scripts/validate_palette.js` against the final brand-primary choice interacting with the categorical set — this document proposes the direction, not a validated final palette.

## 4. Typography

One typeface family, no serif or display face anywhere (matches the dataviz skill's typography rule, extended app-wide for consistency between chart labels and surrounding UI text): **Inter** (variable font) as primary, with the system stack (`system-ui, -apple-system, "Segoe UI", sans-serif`) as fallback. Inter is chosen specifically for its tabular figures and wide adoption in the exact reference products named in the brief (Linear, Vercel).

A secondary **monospace** (`ui-monospace, "JetBrains Mono", monospace`) is used sparingly for asset ticker symbols, simulation IDs, and timestamps — a small, deliberate nod to "precise/engineered" that Linear and Vercel both use the same way.

Type scale (desktop; mobile steps down one size per level below H2):

| Token | Size / line-height | Weight | Use |
|---|---|---|---|
| Display | 40/48 | 600 | Marketing/landing only — never inside the app shell |
| H1 | 32/40 | 600 | Page title |
| H2 | 24/32 | 600 | Section heading (e.g. "Growth Over Time") |
| H3 | 20/28 | 500 | Card/panel title |
| Body | 16/24 | 400 | Default reading text, AI explanation prose |
| Body Small | 14/20 | 400 | Secondary/meta text, form help |
| Caption | 12/16 | 400 | Timestamps, disclaimers, axis labels |
| Hero Figure | 48–64/1.1 | 600 | Final value / CAGR stat tiles |

**Numeric discipline is a correctness issue, not a style one.** Every dollar amount, percentage, and date column uses `font-variant-numeric: tabular-nums`, so figures don't visually jitter or misalign as a user scans a results screen or a history table — directly serving "precise" as a brand trait, not just a nicety.

## 5. Spacing/layout system

4px base unit; scale: `4, 8, 12, 16, 24, 32, 48, 64, 96`. 8px grid for component internal padding and gaps.

Layout: 12-column responsive grid; app content max-width **1120px** (deliberately narrower than a typical marketing site — this is a reading-and-deciding tool, not a sprawling dashboard, and a capped width keeps the growth chart and explanation prose at a comfortable reading measure). Marketing/landing pages may use a wider max-width (1280–1440px) for hero sections only.

Prose measure: AI explanation and Financial Tutor text is capped at **65–75 characters per line** regardless of container width — long-form educational text is a first-class content type here (not an afterthought bolted onto a metrics dashboard), and readability research is unambiguous that uncapped line length hurts comprehension.

Whitespace ratio: favor Stripe/Apple-style generous whitespace on *decision* screens (Simulator input, landing) where the user is doing one thing; allow higher density on *reference* screens (Simulation History, Asset Explorer tables) where scanning many rows is the job — density should be a deliberate per-screen choice, not a global setting.

## 6. Border radius / shadow / elevation

Small, consistent radius scale — sharp-ish like Linear/Stripe, explicitly avoiding the "rounded-pill-everything" consumer-fintech look:

| Token | Value | Use |
|---|---|---|
| `radius-sm` | 6px | Buttons, inputs, badges |
| `radius-md` | 10px | Cards, panels |
| `radius-lg` | 16px | Modals, sheets |

Elevation is **border-first, shadow-second** (Linear/Stripe-docs convention), not the heavy drop-shadow style common to consumer dashboards:

| Level | Treatment | Use |
|---|---|---|
| Resting | 1px hairline border only | Cards, panels, table rows |
| Raised | hairline border + shadow `0 2px 8px rgba(0,0,0,0.06)` | Dropdowns, popovers, tooltips |
| Overlay | hairline border + shadow `0 12px 32px rgba(0,0,0,0.16)` | Modals, dialogs |

No neumorphism, no glow/blur effects, no gradient borders — these read as "crypto-bro" specifically and are called out in the brief's avoid list.

## 7. Component style direction

Flat, precise, information-dense where density earns its keep (history tables, comparison rows), generously spaced where a decision is being made (simulator form). Cards are used to mean something specific — "this is one bounded output" (one metric, one chart, one panel) — never as generic decoration; a screen with cards everywhere communicates nothing.

- **Buttons**: solid (Ledger Navy) primary, ghost/outline secondary, text-only tertiary. Hover/active states are background-tint and slight opacity shifts — never scale/bounce transforms (those read as playful/gamified, working against "calm").
- **Inputs**: bordered, label-above (not floating-label — floating labels hurt scanability of pre-filled numeric fields, a real cost here since most inputs are financial figures or dates), visible 2px focus ring in brand color, inline validation directly under the field.
- **Tables** (Simulation History, any future comparison view): dense rows, right-aligned tabular-numeric columns, sticky header on scroll, zebra-striping avoided in favor of hairline row dividers (matches the border-first elevation model).
- **Badges**: used for state (split disclosed, dividend-reinvested, anonymous vs. saved), always icon + label, colored from the status palette only.
- **AI Explanation panel**: visually distinct from calculated-metric panels (a subtle background tint or a labeled "AI-generated" header band) so a reader can never mistake AI narrative for a Simulation Engine output — this is a trust-and-compliance requirement, not a style preference (see §14, risk 4).

## 8. Chart design philosophy

Governed by the dataviz skill (loaded for this review) and the brief's own rule: **every chart answers a user question.** Concretely, for the data this API actually returns:

| Chart | Question it answers | Data source | Form |
|---|---|---|---|
| Growth line | "How did my investment grow between start and end date?" | `growth_series` | Single-series line, thin mark, event markers for splits/dividends overlaid — not a second chart |
| Nominal vs. real | "What did inflation actually cost me?" | `final_value` vs. `inflation_adjusted_final_value` | Two-line comparison on **one shared axis**, or an indexed single line with a toggle — never a dual-axis chart (the dataviz skill's #1 banned anti-pattern) |
| Final value composition | "How much of this came from price growth vs. dividends?" | derived only from fields the API already returns (never client-computed) | A simple stat row or single segmented bar — not a pie; two-to-three-part compositions read faster as tiles or one bar than as a pie |
| Headline metrics (Final Value, ROI, CAGR) | "What's the bottom line?" | `final_value`, `total_return_percentage`, `cagr_percentage` | Stat tiles / hero numbers — per the dataviz form heuristic, a single number is not a chart and should never be forced into one |

Rules carried over from the skill, stated here as project policy:
- **One hue, one meaning, everywhere.** The chart-blue series color always means "portfolio value" and is never reused for UI chrome elsewhere on the same screen (see §3).
- **The frontend plots only what the API returns.** No client-side interpolation, smoothing, or derived math drawn on a chart — this is the chart-specific instance of "frontend must never calculate financial results," and it is the single most important rule in this whole document to enforce in code review.
- Every chart ships with a table-view fallback and a legend when ≥2 series are present (dataviz accessibility pass, §11 below).
- The growth chart must have an explicit **degraded-data state**: `growth_series`/`disclosed_splits` currently return empty on `GET /simulations/{id}` retrieval (KI-021 — not yet persisted). The chart component must recognize "empty because not yet computed" as a distinct, honestly-labeled state ("Detailed growth chart is available immediately after running a simulation") — never a silently blank chart, which would look like a bug or, worse, look like "no growth occurred." Flagged again as a blocking risk in §14.

## 9. Motion/animation principles

Motion communicates a state change; it is never decorative. Full list of intentional motion in this system:

- **Number count-up** on first reveal of a result (400–600ms, ease-out, plays once) — communicates "this number just arrived," nothing more.
- **Chart line draw-in** on first chart render (same duration/easing family) — same purpose, applied to the growth chart specifically.
- **Skeleton → content crossfade** on data load (150–200ms).
- **Micro-interactions** (hover, focus, button press): 120–160ms, ease-in-out, opacity/background-tint only.

Explicitly **no**: confetti, celebratory bursts, bounce/spring physics on gains, or any animation whose intensity scales with the size of a positive return. A +150% historical outcome and a -40% one get the *same* reveal treatment — color and a +/− sign carry the meaning, motion does not editorialize it. This is a direct, deliberate rejection of the "Robinhood/gambling energy" the brief names, and should be treated as a hard rule in review, not a style suggestion.

`prefers-reduced-motion` is respected everywhere: every transition above degrades to an instant state change with no information loss (the count-up shows the final number immediately; the chart renders fully drawn).

## 10. Empty / loading / error state principles

- **Loading**: skeleton screens matching the final layout's shape for any fetch expected to take >300ms. Simulation creation specifically gets a named-step affordance ("Calculating historical returns…") rather than a generic spinner — transparency about what's happening is a brand value, not just UX polish, and it directly reflects what's actually happening server-side (a real calculation, not a network delay to hide).
- **Empty**: every empty state is informative, never a bare blank area. Asset search's "no results" (an explicit `200 OK` per `docs/api_design.md`, not an error) gets icon + text + a suggestion to broaden the query, matching the spec's own framing of it as a normal outcome.
- **The AI-unavailable fallback is not an error state.** Per Founder Decision 003, the fixed message ("Simulation completed successfully. AI explanation is temporarily unavailable. Your financial results remain accurate.") is returned as a normal successful HTTP response for *every* failure category (provider down, integrity check failed, structure check failed). The frontend must render this with the **same calm, neutral visual treatment as a successful explanation panel** — never a red/error styling — otherwise the UI would misrepresent a deliberately-safe backend behavior as a bug. This is the single most important state-handling rule in this document to get right, precisely because it's the easiest one to get wrong by default (an engineer's instinct is to red-flag any "unavailable" message).
- **Errors** (real ones — `VALIDATION_ERROR`, `ASSET_NOT_FOUND`, `MISSING_HISTORICAL_DATA`, `RATE_LIMIT_EXCEEDED`, 500-class): always state what happened in plain language, reassure on data integrity where applicable, and offer one concrete next action. Field-level validation errors render inline at the field; system-level errors render as a banner/toast. `request_id` (present on every error envelope per `docs/api_design.md`) is shown small and secondary, for support reference only — never a raw stack trace or SQL error to the user.

## 11. Accessibility rules

- WCAG 2.1 AA minimum, app-wide (not just charts).
- Color is never the sole carrier of meaning: gains/losses pair color with an explicit `+`/`-` sign; status badges pair color with an icon and a text label (dataviz status-palette rule, applied outside charts too).
- Every chart ships a table-view fallback (required at minimum for the growth chart, this product's most important visualization).
- Full keyboard operability: simulator form, results tabs, history table sorting, and the Financial Tutor chat input must all be usable without a mouse.
- Visible focus rings everywhere, 2px, brand color — never `outline: none` without an equivalent replacement.
- AI Markdown output renders through semantic HTML (the six required sections — Summary, What Happened, Why It Happened, Financial Concepts, Key Takeaways, Limitations, plus the code-appended Educational Disclaimer — become real `<h2>`/`<h3>` elements, not styled `<div>`s), so screen-reader users get the same structured reading experience sighted users do.
- Minimum 44×44px touch targets on any interactive control at mobile widths.
- Respect `prefers-reduced-motion` (§9) and `prefers-color-scheme` (§3) as first-class inputs, not afterthought media queries.

## 12. Responsive design principles

Breakpoints: mobile `<640px`, tablet `640–1024px`, desktop `≥1024px`, wide `≥1440px` (content width capped, never stretched edge-to-edge).

Per-component responsive strategy (a deliberate per-component decision, not one blanket "make it responsive" pass):
- **Simulator form**: desktop-first is a reasonable default (it's a considered, multi-field decision task best done on a larger screen), but must remain fully usable on mobile given the primary persona (college students) skews mobile-heavy — this tension is named explicitly as a risk in §14.
- **Growth chart**: reflows to fewer x-axis ticks and a taller aspect ratio below tablet width; the nominal-vs-real comparison stacks its two lines' legend vertically rather than compressing horizontally.
- **Simulation History table**: becomes a card list on mobile rather than a horizontally-scrolling table; if a future wide comparison table is unavoidable, it scrolls within its own bounded container, never causing page-level horizontal scroll.
- **Financial Tutor chat**: designed mobile-first and scaled up — a chat interface is naturally a narrow-column experience, the inverse of the simulator's desktop-first approach.

## 13. Pages/components needed for M7

**Pages** (mapped to concrete, already-implemented API endpoints — nothing here is speculative):

1. **Landing/Home** — brand introduction, one primary CTA into the Simulator. Marketing-lite; this is not a feature-sprawl site.
2. **Simulator** (`POST /api/v1/simulations`) — asset search/autocomplete (`GET /assets`), amount/date/dividend/inflation inputs, date-range pre-validation against `GET /assets/{symbol}/availability` before submit (so users don't hit `MISSING_HISTORICAL_DATA` avoidably).
3. **Results** — the core screen. Hero stat tiles (Final Value, ROI, CAGR), growth chart, inflation/dividend breakdown, split disclosure badges, AI Explanation panel (six sections + disclaimer), Financial Tutor follow-up chat.
4. **Asset Explorer / Asset Details** (`GET /assets/{symbol}`, `.../availability`) — historical overview, entry point into the Simulator pre-filled with the chosen asset.
5. **Simulation History** (auth-gated, `GET /simulations` — M5+ auth required) — list of past simulations with asset filter.
6. **Auth** — Login / Register (email + password only, per Founder Decision 002). No "forgot password" link — that flow doesn't exist yet (KI-031); the screen must not imply a capability the backend doesn't have.
7. **Error / Not Found** — 404 and a generic error boundary, styled per §10.
8. **Educational Disclaimer / About** — a real, linkable page for the "not a financial advisor" positioning and the fixed disclaimer text, rather than only ever appearing as a footer line inside an AI panel.

**Shared components**: `AssetSearchCombobox`, `SimulationForm`, `DateRangePicker` (availability-constrained), `MetricStatTile`, `GrowthChart`, `ComparisonChart` (nominal vs. real), `AIExplanationPanel` (sanitized Markdown renderer + fixed disclaimer footer), `TutorChat`, `SplitDisclosureBadge`, `EmptyState`, `ErrorState`, `Skeleton`, an API client hook that maps the `{success, data}` / `{success: false, error: {code, message, request_id}}` envelope to one central error-code→copy table, `Toast`/`Banner`, `Navbar` (auth-state aware).

**Explicitly not in this list, pending confirmation** (§"Decisions needed"): Asset Comparison and Report Generation UI (flagged in `.claude/MVP_RULES.md` as unconfirmed MVP scope); Account/Settings and multi-device session management (backend primitives exist per ADR-017, but no UI has been scoped); Admin import screens (backend routes don't exist yet either — KI-023).

## 14. Risks or design concerns before implementation

1. **`growth_series`/`disclosed_splits` are empty on retrieval** (KI-021 — not yet persisted). The Results screen's single most important chart is unavailable for any revisited or shared simulation link, which directly undercuts Founder Decision 002's "anonymous users may... share simulation links" use case. Needs a decision: fix backend persistence before/alongside M7, or ship a first-class "chart only available right after creation" state (§8). Recommend resolving before Results-screen implementation begins.
2. **Anonymous AI-generation gating is ambiguous.** Founder Decision 002 states anonymous users "may not... generate AI reports," but the as-built `explanations` router (`get_current_user_optional`) currently permits AI explanation generation for anonymous-owned simulations. This is a product decision, not just an engineering detail — the frontend needs a definitive answer before designing the "Explain this result" call-to-action (show to everyone vs. gate behind sign-up).
3. **Asset Comparison and Report Generation are unconfirmed MVP scope** per `.claude/MVP_RULES.md`'s own internal-spec-inconsistency flag. Recommend excluding both from the M7 Phase 1 page list (§13) until the founder confirms, rather than building UI against a feature that may not ship.
4. **AI-rendered Markdown is the platform's highest-severity frontend risk.** Even though the backend's structure/numeric-integrity/advice-language safety gates (`app.ai.safety`) already reject unsafe content server-side, the frontend must independently never render raw HTML from the AI response and must sanitize all Markdown defensively. This is belt-and-suspenders by design — a rendering bug here would be the one frontend defect capable of violating the platform's core "AI never generates financial facts" promise from the user's point of view, even if the backend behaved correctly.
5. **Rate limiting needs a designed state, not a generic error.** 60/min on simulation creation and 20/min on AI endpoints (`docs/api_design.md`) are normal, expected limits (e.g., a classroom demo hitting the simulator repeatedly), not edge cases — a `RATE_LIMIT_EXCEEDED` response deserves a friendly, specific "slow down" state (§10), not the generic error banner.
6. **Mobile-primary persona vs. desktop-natural content.** College students (the named primary persona) are heavy mobile users, but the Simulator's dense multi-field form and the Results screen's chart-plus-table density are both naturally desktop-first content. §12 proposes a per-component resolution, but this tension should be explicitly acknowledged and accepted by the founder, not discovered during implementation.
7. **Nullable fields need a designed "not applicable" treatment.** `inflation_adjusted_final_value` is `null` whenever inflation adjustment wasn't requested *or* whenever a real CPI data gap exists (`docs/simulation_formulas.md` §5) — two different meanings for the same null. Every stat tile bound to a nullable field needs a treatment that reads as "not requested" or "data unavailable," never as blank space or a misleading zero.
8. **No password reset exists yet** (KI-031). Auth screens must be designed honestly around this gap (§13, page 6) rather than implying a capability that doesn't exist.

---

## Recommended frontend design direction

Build Investment Time Machine as a **calm, precise, document-grade product** — closer in spirit to a well-designed research report or a Stripe/Linear internal tool than to a consumer trading app. One brand-navy accent for interactive chrome, kept strictly separate from a validated, CVD-safe chart palette anchored on a single "portfolio value" blue; flat, border-first surfaces with minimal shadow; Inter throughout with tabular numerals on every financial figure; motion that only ever announces "this value just arrived," never celebrates it. Every screen should be answerable with "what question does this screen let the user answer" — if a component doesn't serve that, it's clutter, regardless of how polished it looks.

This direction is a natural visual expression of the backend's own four non-negotiable principles (`.claude/SYSTEM.md`): if the Simulation Engine's discipline is "never fabricate, never estimate," the frontend's discipline should be "never dramatize, never hide the source of a number."

## Decisions needed from founder

1. Approve or amend the proposed brand palette (§3) — in particular, the "Ledger Navy" brand-primary hex is a proposal, not a locked value, and this is the first visual-identity decision this project has made (no prior brand assets exist).
2. Resolve the anonymous-AI-generation ambiguity between Founder Decision 002's text and the as-built `explanations` router (risk 2) — needed before the Results screen's AI panel can be designed with confidence.
3. Confirm whether `growth_series`/`disclosed_splits` persistence (KI-021) is fixed before M7 Phase 1 begins, or whether the frontend should design around the current empty-on-retrieval gap (risk 1).
4. Confirm Asset Comparison and Report Generation are out of M7 Phase 1 scope (risk 3), pending the standing MVP-scope-inconsistency flag in `.claude/MVP_RULES.md`.
5. Confirm dark mode is in M7 Phase 1 scope (recommended, matching the Vercel/Linear reference direction) versus deferred to a follow-up pass.
6. Confirm Account/Settings and multi-device session management UI scope for M7 vs. a later increment (the backend primitives already exist per ADR-017, but no UI has been scoped against them).

## Suggested M7 Phase 1 plan

1. Founder sign-off on this document and the six open decisions above (promote to a Founder Decision + corresponding ADR, per project convention).
2. Design tokens only: implement the Tailwind config (colors, spacing, radius, shadow, type scale from §3–6) with no pages yet — verify tokens render correctly in both light and dark mode before any screen is built.
3. Build shared primitives in isolation (Button, Input, Card, StatTile, Badge, EmptyState, ErrorState, Skeleton) against the token set, reviewed against §7 and §11 before use in a real screen.
4. Build the typed API client layer matching the `{success, data}` / `{success: false, error}` envelope (`docs/api_design.md`) and one central error-code-to-copy mapping table — this is the layer every subsequent screen depends on, so it should be correct and reviewed before screens start.
5. Build the Simulator → Results flow end-to-end first, ahead of every other page — this is the platform's core "simulate-and-explain loop" (`.claude/MVP_RULES.md`'s own stated success signal), and validating it early de-risks the rest of M7 more than any other sequencing choice.
6. Layer in Asset Explorer, Simulation History, and Auth screens.
7. Run a full accessibility and responsive QA pass against §11–12 of this document as a literal checklist, not a vibe check.
8. Hold a design review checkpoint before declaring M7 complete, matching the M4/M5/M6 precedent of review-then-approve-then-ship.

---

## 15. Component State System (M7 Phase 3D-1 — Craft & Coherence)

Added after the M7 Phase 3D Design Elevation shipped a visual direction but left individual component *states* under-specified. Every interactive element in this codebase must define its default/hover/focus-visible/active/disabled states explicitly — this section is the enforceable checklist a code reviewer should hold a new or changed component against, not aspirational prose. All transitions here are 120–200ms, ease-out, transform/opacity/color only, matching FD-018's explicit carve-out ("Hover/press/focus feedback is state communication and is permitted and expected").

| State | Rule | Reference implementation |
|---|---|---|
| **Default** | Resting appearance uses only semantic tokens (never a primitive directly) so it adapts correctly inside `.itm-elevated` with zero component-level change. | Every primitive in `src/components/ui/` |
| **Hover** | A background/color luminance shift only — never a scale, lift, or shadow-grow (`frontend_design_system.md` §6's border-first elevation model forbids the latter). | `Button`'s `hover:bg-primary-hover`, `AssetSearchCombobox`'s option `hover:bg-background` |
| **Focus-visible** | The global `:focus-visible { outline: 2px solid var(--focus-ring-color) }` (`globals.css`) — never `outline: none` without an equivalent replacement. `--focus-ring-color`/`--input-border-focus` are **re-declared inside `.itm-elevated`** (not just `--color-primary`) — a real bug found live during this pass: a custom property's `var()` reference resolves once, at its own declaration's scope, and then inherits as a static value; re-declaring `--color-primary` alone does *not* make an already-declared-elsewhere property "re-follow" it. Any future token that composes another token via `var()` and needs to vary per elevated/non-elevated context must be re-declared at `.itm-elevated` directly, the same way. | `globals.css`'s `.itm-elevated` block (all three light/dark variants) |
| **Active/pressed** | A firm ~0.98 scale compression, ~120ms — never a bounce or scale-up (BRAND_CONSTITUTION.md §8: "confidence reads as an immediate, certain response, not a springy one"). | `Button`'s `active:scale-[0.98]` |
| **Disabled** | Reduced opacity + `pointer-events: none` — never removed from the DOM or visually identical to enabled. | `Button`'s `disabled:pointer-events-none disabled:opacity-50` |
| **Working/loading** | A label change is the primary signal (e.g. "Calculating historical returns…"); a spinner icon is a genuine, narrow exception to FD-018's no-loop rule — it may only spin while a real request is in flight, and is omitted outright (not frozen) under `prefers-reduced-motion`, so the loading state degrades to a static label change with no motion at all. | `Button`'s `loading` prop, gated on `useReducedMotion()` |
| **Invalid (form validation)** | A warm tone (`--color-status-serious`, exposed as `--input-border-invalid`) — **never** `--color-status-critical`, which is reserved from this pass forward for hard system/API errors (`ErrorState`) only. This is a real, disclosed semantic split from the previous single shared "error red." | `Input`/`AssetSearchCombobox`'s `border-[var(--input-border-invalid)]` |
| **Required marker** | A muted, small glyph (`text-ink-muted`, reduced size) — never the harsh default red asterisk, which reads as an alarm for a routine, expected state. | `Input`/`AssetSearchCombobox`'s label asterisk |
| **Toggle (on/off)** | A 150ms thumb transition, track color shifts to accent when on — built on a real, native `<input type="checkbox">` (visually hidden via `sr-only`, never `display:none`, never removed from the tab order). | `ToggleField`, `simulation-form.tsx` |
| **Disclosure (open/closed)** | A rotating chevron (150ms) plus a one-shot CSS grid-template-rows (`0fr`→`1fr`) height/opacity transition — never native `<details>`'s instant snap, never scroll-linked, never looping. Content stays in the DOM while collapsed (`inert`, not unmounted) so it's never "hidden," only visually collapsed. **Every disclosure in the product uses this one shared primitive** — `Disclosure` (`src/components/ui/disclosure.tsx`) — not a bespoke per-screen implementation. | `Disclosure`, used by Supporting Facts' "Source," The Proof, Simulator's "More options," Results' "Technical details," and `ErrorState`'s "Technical details" |
| **Copied/confirmed (one-shot feedback)** | A brief, static label + icon swap (e.g. "Copy link" → a checkmark + "Link copied") that reverts after a few seconds — a one-shot state change, never a repeating or looping affordance. | `CopyLinkButton`, `simulation-result-client.tsx` |

## 16. Accent Discipline (M7 Phase 3D-1 — Craft & Coherence)

The single warm accent hue (`--color-accent`, ported from the founder-approved mockup) is **scarce by design** — its entire value as a signal depends on it appearing rarely enough that every appearance reads as meaningful. This section is the enforceable allowlist; anything not on it should default to plain ink, not accent.

**Accent may appear for:**
1. **Hero figures** — the two answer-bearing figures in the Results page's worked-example sentence (the invested amount, the final value), including their one-shot scramble glow.
2. **Primary interactive chrome** — via the existing `--color-primary` → `--color-accent` remap inside `.itm-elevated` (`globals.css`), which is why the Simulator's CTA button, the Results page's text links ("Run another simulation"), and every focus ring inside an elevated surface are all accent-colored through **one shared mechanism**, not scattered per-component accent classes. This is a fifth category beyond the four literal ones this section originally named, and is deliberately unified rather than hand-applied — a future primary-action element should reach for `variant="primary"`/the `--color-primary` token, never `text-accent`/`bg-accent` directly, so it inherits this same single point of control.
3. **Key, singular data marks** — e.g. a single stat's glow-on-settle pulse.

**Accent must NOT appear for:**
- Repeated decorative headings (the Why section's three sub-headings were accent-colored in the original M7 Phase 3D pass and are now plain `text-ink-primary` — three accent headings on one screen was scarcity-breaking overuse, not "key data").
- Disclosure trigger glyphs (the mockup's accent "+" mark is now a neutral `text-ink-muted` chevron via the shared `Disclosure` primitive — a decorative affordance icon is not a hero figure or a primary action).
- Repeated table columns (The Proof's growth-data table Value column was accent-colored per-row in the original pass — dozens of accent cells in a scrollable table is the clearest possible violation of "scarce by design," now plain `text-ink-primary`).
- **The Growth Chart's data line, fill, or endpoint marker** — deliberately kept the CVD-validated `--color-chart-portfolio` hue (§3), never accent, per `docs/ARCHITECTURE_DECISIONS.md` ADR-044's own reasoning: the chart-data palette is a closed, validated set a UI accent must never be substituted into, regardless of how visually tempting a mockup's literal color choice is.
- Negative/loss values — those use `--color-negative-tint` (a separate, restrained warm tone), never accent and never `--color-status-critical`.

A useful working test before adding a new accent usage: *if this appeared five times on the same screen, would it still feel special?* If the honest answer is no, it isn't a hero figure, a primary action, or a key data mark — it's decoration, and belongs in plain ink instead.

## 17. Logo Mark (M7 Phase 3D-6 — Final Touch Pass)

The brand mark is a single filled logarithmic-spiral path (`LogoMark`, `src/components/shell/logo-mark.tsx`; the standalone favicon at `app/icon.svg` ports the identical path) — founder-selected direction: "the pure spiral," a plain closed spiral evoking compounding growth, gold (`--color-accent`) fill, no stroke, no raster. Used in the navbar lockup (mark sized to the wordmark's cap height), quietly bare in the footer and the 404/error pages.

**The mark never animates, spins, or is used as a loading indicator, anywhere in the product** — a static spiral must not be mistakable for a spinner. No call site may add a `transition`/`animation` class or an `animate-spin` utility to it.


