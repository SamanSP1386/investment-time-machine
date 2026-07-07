# Brand Constitution — Investment Time Machine

**Status: APPROVED.** This is the authoritative source of truth for the product's visual identity and brand philosophy, effective from M7 Phase 1 onward. Every future frontend decision — token, component, copy, or interaction — is measured against this document first.

**Relationship to `docs/frontend_design_system.md`**: that document remains the authoritative *implementation*-level design system — token values, component specs, per-endpoint chart rules, page inventories. This document is upstream of it: where the two ever appear to differ, `frontend_design_system.md` must be revised to match this constitution, not the other way around. This document does not restate implementation detail already settled there (e.g., the exact spacing scale, the exact chart-per-endpoint mapping) — it states the philosophy that detail must obey.

Grounded in `.claude/SYSTEM.md`'s four non-negotiable engineering principles, `docs/FOUNDER_DECISIONS.md` 001–003, `docs/api_design.md`, `docs/simulation_formulas.md`, and the three-part M7 Phase 0 design review that produced it (Phase 0: initial design system; Phase 0B: skill-validated pressure test; Phase 0C: brand identity deep-dive). Approved under Founder Decisions FD-004 through FD-012 (§3).

---

## 1. Brand Philosophy

Investment Time Machine is a historical investment intelligence platform: it lets a person simulate a real investment decision against real historical market data and understand, precisely, what would have happened and why. It is an educational product first and a technical product second — its entire reason to exist is the belief, stated plainly in `.claude/MVP_RULES.md`, that "users value understanding historical investment outcomes." It is built on a deterministic Simulation Engine that is the sole source of financial truth in the system, with an AI layer strictly downstream of it, explaining but never calculating (`.claude/SYSTEM.md`, Principles 3–4).

It is **not** a brokerage, a trading platform, a prediction engine, a recommendation system, a gambling product, a social platform, or hype-driven fintech. There is no next trade to make here, no position to enter, no leaderboard to climb. Every reference persona — the college student learning, the retail investor researching, the researcher verifying — is here to understand something that already happened, not to be moved toward an action.

It exists because most people's understanding of "what if I had invested in X" is built on vague memory and marketing narrative, not on an auditable calculation. The product's entire value is in being more honest and more precise about the past than anything else a person could easily reach for.

## 2. Brand Personality

If Investment Time Machine were a person, it is a former quant who now teaches: someone who spent a decade auditing financial models for a living, grew tired of the industry's comfort with false confidence, and now writes the clearest possible explanation of *why* a historical outcome happened — never *what to do next*, because giving that advice was never their job and isn't now.

| Trait | Description | Sounds like | Never sounds like |
|---|---|---|---|
| Precise | Every claim traces to a specific number or a specific gap in the data | "This investment would have returned 9.2% annually." | "This investment crushed the market!" |
| Patient | Nothing here is time-sensitive; the outcome already happened | "Explore this outcome whenever you're ready." | "Prices are moving — act now." |
| Honest about uncertainty | A data gap is stated, never smoothed over | "Inflation adjustment is unavailable for this date range." | (silently omitting the caveat) |
| Understated | The data does the persuading, not the voice | (states the number, states the source) | "Incredible! Unbelievable! Life-changing!" |
| Pedagogical | Teaches the concept, never nudges toward an action | "CAGR differs from total return because..." | "You should have bought more." |

**Communication style**: short, declarative, present tense for facts and past tense for historical outcomes. No rhetorical questions, no exclamation points, no emoji, no gamified praise. A −40% historical outcome and a +150% one are narrated in the same even register — this is the single clearest tell that separates an education platform from a trading app.

**Decision-making**: every design or copy decision is tested against "does this help someone understand a historical outcome more precisely?" before "does this look impressive?" Premium *feel* is a byproduct of taking precision seriously, not a goal pursued for its own sake — this mirrors `.claude/SYSTEM.md`'s own engineering priority order (Correctness → Security → Reliability → Maintainability → Performance → Aesthetics) applied to the brand layer.

**Visual behavior**: restrained, structural, unhurried. The product never raises its visual voice — no flashing, no confetti, no color intensity that scales with a number's size. Visual confidence comes from consistency and precision (a hairline that's always exactly where it should be), not from spectacle.

**Educational philosophy**: explain the concept, cite the source, state the limitation, stop. Never editorialize past what the data supports, never fill a real gap with a plausible-sounding guess, and never let an explanation imply certainty the underlying data doesn't have.

## 3. Core Brand Principles

Four principles are inherited directly from the platform's engineering foundation (`.claude/SYSTEM.md`) and restated here as brand law: if the Simulation Engine's discipline is "never fabricate, never estimate," the brand's discipline is "never dramatize, never hide the source of a number." If the AI's discipline is "explain, never calculate," the brand's discipline is "the AI panel must never visually compete with the Simulation Engine's own authority." If the system's discipline is "correctness before aesthetics," the brand's discipline is "restraint before spectacle." If the platform's users can remove every AI component and lose no financial functionality, the brand's visual language must make that same independence legible — the AI panel looks like an appendix, never like the main event.

The following Founder Decisions govern every visual and product decision made from M7 forward:

- **FD-004 — Visual direction approved.** The design system and brand direction developed across the M7 Phase 0 review (this document included) is approved as the binding baseline for all frontend work.
- **FD-005 — Themes from day one.** Light and dark themes are supported architecturally from the first token committed — dark mode is a first-class expression of the brand, not a deferred enhancement bolted on later.
- **FD-006 — Comparison and reporting deferred.** Asset Comparison and Report Generation remain out of M7 scope, regardless of their ambiguous status in the founder specification's own internal documents.
- **FD-007 — Minimal account surface.** M7 builds only a minimal Account/Settings experience — email display, password change, and logout-of-all-sessions. Nothing else (no notification preferences, no multi-device session management UI, no billing) is in scope, even though some backend primitives for it already exist.
- **FD-008 — Growth chart correctness is a backend precondition, not a UI workaround.** Growth chart consistency is preserved through deterministic backend behavior — `growth_series` and `disclosed_splits` must be reliably available on every retrieval, not only at creation time, before the Results experience is considered complete. The frontend does not permanently design around this gap; it is a blocking prerequisite.
- **FD-009 & FD-010 — Anonymous AI access, protected.** Anonymous users may generate educational AI explanations. This access is protected by clear rate limits and abuse controls, and any limit reached is communicated in plain, friendly language — never as a punitive error, and never implying the user did something wrong.
- **FD-011 — Trust and education over excitement.** The visual identity reinforces trust, historical accuracy, and education ahead of excitement in every instance. Every visual element helps a user understand a historical outcome; none is permitted to encourage speculation or trading behavior.
- **FD-012 — Confidence without ego.** Investment Time Machine earns trust through correctness, transparency, and restraint — never through visual spectacle. The product prefers admitting uncertainty over presenting misleading confidence, in copy and in visual design alike.

## 4. Visual Philosophy

- **Whitespace**: generous on decision screens (Simulator, Landing) where a user is doing one considered thing; earned and compressed on reference screens (Simulation History, Asset Explorer) where scanning many rows is the job. This split is a deliberate per-screen choice, never a single global density setting.
- **Hierarchy**: exactly three visual weights active on any given screen — a hero element, supporting body text, and muted meta text. A screen that needs a fourth weight to make sense is doing too much and should be split.
- **Rhythm**: a strict 4px-based vertical rhythm, plus one recurring horizontal structural element — the time axis (§5) — that every major screen touches at least once, giving otherwise-disparate screens a shared visual anchor.
- **Composition**: asymmetric-but-anchored. Not centered-everything (reads as marketing template) and not scattered (reads as dashboard clutter) — content left-anchored to a consistent margin, with the time-axis rule as the one deliberate horizontal anchor.
- **Density**: reference screens may be dense because every row is load-bearing information; decision screens never are, because density there would compete with the one question the screen is meant to answer.
- **Layout flow**: every page states its evidence before its action — data, then interpretation, then (if any) a next step. This mirrors the platform's own causal order: data → simulation → explanation.
- **Iconography**: one stroke-based icon family (Lucide or Heroicons), fixed at 1.5px stroke weight, outline style only — never filled, never duotone, never mixed within the same hierarchy level. Every icon pairs with a text label; none stands alone as the sole carrier of meaning. No emoji anywhere in the product, including inside AI-generated content.
- **Illustration**: none. No stock illustration, no isometric graphics, no 3D renders. The only imagery this product uses is real: real chart renders, real product screenshots, and the time-axis motif as the sole abstract graphic device. Illustration is a warmth-signaling convention borrowed from consumer SaaS; this brand's target emotion is credibility, not warmth, and none of its reference points (Stripe docs, Bloomberg, a well-typeset annual report) lean on it either.
- **The wordmark is typographic, not iconographic.** Consistent with the no-illustration principle, the product's identity is expressed through type — "Investment Time Machine" set in the primary typeface at a fixed weight and tracking — rather than through a symbol or mark. A full lockup is used in wide contexts (navbar, landing hero, document headers); no abbreviated icon-only mark exists or is needed. This resolves the identity question without requiring illustration work the brand philosophy itself argues against.

## 5. Time Axis Philosophy

The product's central visual idea is **time itself** — history, timelines, progress, the left-to-right experience of exploring something that already happened. This is not a decorative theme layered on top of the product; it is a structural motif the actual content already provides (dates, timelines, chronological history), made *visible* rather than merely present.

Concrete, non-gimmicky applications:

- **The growth chart's x-axis reads like a ruler**: evenly spaced tick marks, dates never rotated, split/dividend events shown as small vertical notches directly on the axis — the one place in the product users look longest, and therefore the place the motif should be most legible.
- **A document-style header on the Results screen**: a thin rule, a small kicker label, and the completion timestamp — the screen presents itself as a dated, issued record, not a live dashboard.
- **Timeline tick-marks precede every standalone date** in tables and history lists — a one-pixel-wide, near-free visual cue that appears often enough to become recognizable.
- **Page transitions move along the time axis**: a subtle horizontal slide-and-fade (never a vertical slide or a plain crossfade) is the one and only screen-level transition style used anywhere in the product — motion here is allowed to *say* something about the brand (time moves forward, left to right), which is the one deliberate exception to motion otherwise being purely functional (§8).

The rule that keeps this from becoming gimmicky: the time axis is always structural (an axis, a rule, a transition direction, a tick mark) and never ornamental (never a background pattern, never a mascot, never a literal clock or hourglass icon). If a proposed use of the motif doesn't organize real content, it doesn't belong in the product.

## 6. Typography

- **Primary — Inter** (variable font), with the system stack as fallback. Chosen because it is the literal typographic precedent of this brand's two closest reference products (Linear, Vercel) and has first-class tabular-figure support, which here is a correctness requirement, not a style preference (§7's numeral discipline depends on it). **IBM Plex Sans was considered and rejected** — a design-system search tool's top "financial trust" recommendation, and a legitimate alternative, but one that pulls the register half a step toward "traditional bank site" rather than "precise research tool built by engineers," which is the wrong half-step for this brand's stated target (§2).
- **Monospace — JetBrains Mono** (or the `ui-monospace` system fallback), reserved for anything that should be *seen* as a measured artifact rather than read as prose: simulation IDs, timestamps, asset tickers, keyboard-shortcut hints, and any inline formula shown to a user (§9).
- **No serif or display typeface anywhere.** One family, one register, everywhere — chart labels and surrounding UI text share the same typographic voice by design.
- **Numeral treatment**: every currency, percentage, and date figure uses `font-variant-numeric: tabular-nums`, without exception — figures must never jitter or misalign as a user scans a table or a results screen. Currency symbols and percent signs render slightly smaller and in muted ink relative to the digits they attach to, so the digits — the actual data — carry the visual weight, not their units.
- **Heading hierarchy**: Display (marketing-only) → H1 (page title) → H2 (section) → H3 (card/panel title) → Body → Body Small → Caption → Hero Figure (the one oversized numeral treatment, reserved for final value/CAGR-class stats). Heading-to-body spacing is always tighter than body-to-next-section spacing, so visual grouping matches semantic grouping.
- **Accessibility**: minimum 16px body text, 1.5–1.75 line-height, 65–75 characters per line for long-form explanation prose regardless of container width, and full support for OS-level text scaling without truncation.

## 7. Color Philosophy

Color here is never decoration — each family exists to answer one question for the user, and using a family outside its purpose actively damages trust.

| Family | Purpose | Emotional register | Misuse |
|---|---|---|---|
| **Brand** ("Ledger Navy" — desaturated navy, light/dark variants) | Signals "this is interactive chrome," full stop | Quiet institutional authority, not corporate-blue genericness | Appearing on a chart series, a status badge, or the AI panel — breaks the user's learned "blue = clickable" association |
| **Neutral** (shared page/surface/ink/border tokens) | The actual majority of every screen | Paper, not glass | Introducing a second neutral family for "cards" vs. "the page" — a chart or card that looks like a different material than the page around it silently implies it's a foreign, less-trustworthy element |
| **Chart-data** (validated CVD-safe palette, one hue per series) | Represents the platform's actual financial truth — the only pixels backed by a real historical number | The one place a small amount of color confidence is earned, because it's carrying real information | Reusing a chart hue for UI chrome, or inventing a new chart hue outside the validated set |
| **Status** (good/warning/serious/critical — four fixed hues) | A small, shared vocabulary between chart annotations and ordinary UI state | Functional, never celebratory — states a fact, doesn't cheer or alarm | Letting "good" (a positive return) drift toward a bright, celebratory green — the moment it does, it starts reading as "you won," which violates FD-011 directly |
| **AI** (a warm neutral tint plus a labeled band — no dedicated hue) | Visually distinguishes AI-generated content from calculated output | Distinct content type, never distinct authority | Introducing a saturated "AI color" — doing so would visually imply the AI is a separate, perhaps more special, source of truth than the Simulation Engine, exactly backwards from Principle 3 |

Every color decision is answerable with one sentence: "this color exists so the user can tell X apart from Y" — if a proposed color can't complete that sentence, it doesn't belong.

## 8. Motion Philosophy

Motion communicates **confidence, arrival, and clarity** — the sense that a correct thing has just appeared. It never communicates celebration, urgency, speculation, or fear, and its intensity never scales with the size or sign of a number.

- **Buttons**: 120–160ms background/opacity tint on press — no scale, no bounce. Confidence reads as an immediate, certain response, not a springy or playful one.
- **Navigation**: instant active-state indication — a confident product never makes a user wait to see where they are.
- **Loading**: skeleton screens shaped like the real layout; the one genuinely slow operation (simulation calculation) gets named-step copy ("Calculating historical returns…"), never a generic spinner standing in for an unexplained wait.
- **Page transitions**: the time-axis horizontal slide (§5) is the only transition style used anywhere — one motion signature, applied consistently, rather than a different transition per screen.
- **Charts**: the growth line draws in once, on first render only; event markers (splits/dividends) appear with a slight delay after the line completes, so the causal read is "here's what happened, then here's what happened to it."
- **Hover states**: opacity/tint only, matching button timing — never a lift or shadow-grow, which would contradict the border-first elevation model.
- **A +150% outcome and a −40% outcome receive the identical reveal treatment.** Color and a +/− sign carry the meaning; motion never editorializes it. This is the single hardest-to-violate-by-accident rule in this document and should be enforced in code review as strictly as a correctness bug.

`prefers-reduced-motion` degrades every rule above to an instant state change with no information loss, everywhere, without exception.

## 9. UX Philosophy

- **Landing**: marketing-lite, one primary CTA into the Simulator, a real chart screenshot rather than illustration as the hero image. States the product's value in one sentence and gets out of the way.
- **Simulator**: a decision screen — generously spaced, desktop-first but never desktop-only. On mobile, progressive disclosure keeps the primary path to a small number of fields, with dividend/inflation toggles behind a "More options" disclosure. Date-range validity is shown in the picker itself, not only after a failed submit.
- **Results**: leads with three hero numbers (Final Value, ROI, CAGR), then the growth chart, then composition/breakdown, then the AI panel, then the tutor chat — one clear reading order, evidence before interpretation. Every hero number exposes its source formula on hover or tap-to-expand — the single highest-leverage detail for signaling "engineers who care about correctness," and a direct, literal expression of FD-012.
- **Charts**: exist to answer one stated question per chart, never as decoration. Every chart ships a table-view fallback and never uses a dual-axis or a candlestick presentation — the former hides interpretation choices, the latter belongs to a trading product, not this one.
- **AI panel**: visually distinct from calculated output via a warm tint and a fixed "AI-generated" label band (§7), never via red/error styling even when the AI is unavailable — the founder-approved fallback message ("Simulation completed successfully. AI explanation is temporarily unavailable. Your financial results remain accurate.") is a normal, calm state, not a failure. The Educational Disclaimer renders with one fixed, unchanging visual treatment everywhere it appears, functioning as a stamped disclosure rather than incidental fine print. Anonymous users see the same "Explain this result" affordance as authenticated ones (FD-009/010); a reached rate limit is communicated in the same calm register as everything else, never as a punitive block.
- **Authentication**: minimal, honest about its own gaps — no "forgot password" link exists because that flow doesn't exist yet, and the screen never implies a capability the backend doesn't have.
- **Errors**: state what happened in plain language, reassure on data integrity where applicable, and offer exactly one next action. A `request_id` is shown small and secondary for support reference, never a stack trace or raw system detail.
- **Loading**: skeleton screens matching final layout shape for anything expected to take over 300ms; the simulation-creation call specifically names what it's doing, since it's a real calculation, not a network delay to hide.
- **Empty states**: always informative, never a bare blank area — "no results" for an asset search is framed as a normal outcome with a suggestion to broaden the query, matching what the API itself considers a normal response, not an error.
- **Every number the product shows carries a legible source** — a field name, a formula, or an "as of" date sits somewhere reachable from it. A bare figure with no traceable origin is never acceptable on this product.

## 10. Writing Style

- **Tone**: plain, declarative, even-keeled regardless of whether the outcome shown is a gain or a loss. No exclamation points, no rhetorical questions, no gamified praise, no emoji anywhere — including inside AI-generated text, which must be sanitized of any the model might produce.
- **Capitalization**: sentence case throughout, including headings and buttons — title case reads as marketing, sentence case reads as a document.
- **Numbers**: always rendered with tabular numerals (§6); large figures are never abbreviated in ways that could obscure precision (write the full figure, let typography carry legibility, not "$1.2K" shorthand) — a rule that also closes off a known AI-safety blind spot (KI-032's note that abbreviated figures evade the numeric-integrity check).
- **Dates**: unambiguous, full format (`2025-01-01` or "January 1, 2025" — never `01/02/25`-style ambiguity), consistent across the entire product.
- **Percentages**: always signed explicitly (`+9.2%` / `−3.1%`) — the sign is a correctness signal, not a style choice, since color alone must never carry that meaning (§11).
- **Financial language**: descriptive, never directive. "This investment would have returned X" — never "you should," "consider," or "this looks like a good opportunity." Every AI-facing prompt and every piece of static copy is held to this same rule; it is the platform's single most safety-relevant writing constraint (Founder Specification's "AI never generates financial facts or advice," enforced at the copy layer as much as the model layer).
- **Educational language**: explains a concept once, plainly, before using it ("CAGR — compound annual growth rate — measures..."), and states a limitation directly when one exists, rather than omitting it.
- **Error messages**: state cause and remedy in one or two sentences; never expose internal detail (stack traces, SQL, provider error text) to the user, only a `request_id` for support correlation.
- **AI responses**: follow the required six-section structure and the fixed, code-appended Educational Disclaimer exactly, in the same voice as the rest of the product — an AI explanation should not be distinguishable in *tone* from static copy, only in its visual container (§9).

## 11. Recruiter Experience

The product's first minute should leave three different technical reviewers with a converging impression, arrived at from different evidence:

- **A recruiter** scanning the homepage should notice, before reading a word of copy, that there is no gradient hero, no "Sign up now!!" urgency, no pricing page pushing a decision — and should read that absence as restraint, then click through to the Simulator expecting (and finding) the same discipline.
- **A senior engineer** should go straight for the growth chart and the AI panel, notice the provenance-on-hover detail on the hero numbers within seconds, and recognize a team that treats auditability as a UI concern, not only a backend one. The monospace simulation IDs and keyboard-shortcut hints should read as "built by someone who codes," the fastest trust signal available to this specific audience.
- **A hiring manager** should be able to tell, without any specialized financial or technical knowledge, that the product is being honest with them — a −40% outcome and a +150% one presented in the same visual register is legible to anyone, not just a domain expert, and that legibility is the point.

The intended overall impression, stated once and meant to be tested against: *"this feels like software built by engineers who genuinely care about correctness,"* not *"this is another flashy fintech startup."*

## 12. Component Review Checklist

Every future component must satisfy all of the following before it is considered done:

- ✓ Built entirely from tokens defined in `docs/frontend_design_system.md` — no raw hex, no ad-hoc spacing
- ✓ Uses brand-navy only for interactive chrome, never for data or status
- ✓ Uses chart-data hues only inside a chart, never for UI chrome, and never invents a hue outside the validated set
- ✓ Pairs every color-carrying state with an icon or text label — color is never the sole carrier of meaning
- ✓ Never animates in a way whose intensity scales with a financial outcome's magnitude or sign
- ✓ Uses a hairline rule as the only divider style — no shadow-box dividers anywhere
- ✓ Contains no emoji, anywhere, including inside rendered AI content
- ✓ Shows the source of every number it displays — a field, a formula, or an "as of" date, reachable from the value itself
- ✓ Visually distinguishes AI-generated content via tint and label only, never via a competing brand color or red/error styling on a safe fallback
- ✓ Meets WCAG 2.1 AA, including a table-view fallback for any chart
- ✓ Respects `prefers-reduced-motion` and `prefers-color-scheme` as first-class states
- ✓ Contains no urgency language, countdown UI, or streak/gamification mechanic
- ✓ Treats a null or missing value as an honest "not available" state — never a silent zero or blank space
- ✓ Passes "would this look at home in an audited report" before "does this look modern"

## 13. Things We Never Do

- Never celebrate a gain or dramatize a loss — the same calm register applies to every outcome.
- Never hide, smooth over, or silently substitute for missing or incomplete data.
- Never animate profit, or scale any animation's intensity to a number's size or sign.
- Never exaggerate, round misleadingly, or abbreviate a figure in a way that obscures its precision.
- Never mimic a trading app, brokerage, or gambling product's visual grammar — no candlestick charts, no streaks, no countdown timers, no "prices moving now" language.
- Never fabricate certainty — a data gap or an AI-unavailable state is stated plainly, never disguised as a normal result.
- Never let the AI panel visually compete with, or be mistaken for, the Simulation Engine's own calculated output.
- Never give financial advice or directive recommendations, in static copy or in AI-generated text.
- Never use color as the only signal for a state that matters.
- Never introduce a visual element that doesn't serve the question the screen exists to answer.

## 14. Future Evolution

This constitution is written to hold as the product grows past M7 — new asset classes, a future Financial Analytics milestone, a possible mobile app — without needing to be rewritten. Two categories of change are anticipated differently:

**What may evolve freely**: the specific chart types used for new metrics (as long as each still answers one stated question, §9), the exact token values as they're validated and refined, new screens and flows for features not yet built (Asset Comparison, Report Generation, Advanced Analytics), and platform-specific adaptations (a mobile app would follow the same principles through native idiom, not through a literal copy of the web layout).

**What must never change**: the four inherited engineering-to-brand principles (§3), the rule that motion never editorializes a financial outcome (§8), the rule that every number carries a legible source (§9), the rule that the AI is visually subordinate to calculated truth (§7, §13), and the core emotional target itself — "software built by engineers who genuinely care about correctness," never "another flashy fintech startup." Any future feature that would require relaxing one of these to ship is a signal the feature needs to be redesigned, not that the constitution needs an exception.

A useful test for any future addition: if it would look at home in a Robinhood, Coinbase, or generic crypto-dashboard screenshot, it does not belong here, regardless of how the rest of the product has grown.
