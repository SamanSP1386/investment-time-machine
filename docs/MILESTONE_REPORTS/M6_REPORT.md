# Milestone 6 Report — Educational AI System

**Date**: 2026-07-12
**Version**: 0.7.0
**Status**: Complete, pending review

Self-contained — readable from the repository alone (`.claude/`, `docs/`, `backend/`), without needing prior conversation context.

---

## Objective

Implement the Educational AI System — renamed from "AI Analyst" to "Educational AI System" per direct founder instruction — comprising an **Explanation Engine** (structured educational explanations for completed simulations) and a **Financial Tutor** (scoped follow-up Q&A), per Founder Decision 003 (`docs/FOUNDER_DECISIONS.md`), which resolved every Founder Specification silence on provider selection, AI input scope, privacy boundaries, caching/cost control, and integrity validation. Core philosophy, stated as the operative test for every implementation decision: **"The Simulation Engine calculates. The AI teaches."** Frontend, portfolio simulation, advanced analytics, RAG, and a Historical Event Database are explicitly excluded from this milestone; the Simulation Engine is not modified in any way.

## Deliverables

- `app/ai/` — a self-contained Educational AI domain module (exceptions, prompt templates, safety gates, provider abstraction, orchestrating service), structurally independent of `app.simulation` and `app.ingestion`, matching Founder Specification Principle 4 (Simulation Logic Must Be Independent).
- A schema extension to the existing `ai_explanations` table (migration `0003_ai_explanation_type`: `explanation_type`, `question_text`, a composite index) — no new table, no change to any other domain.
- Three endpoints: `POST/GET /api/v1/simulations/{id}/explanations`, `POST /api/v1/simulations/{id}/explanations/questions`, all returning a normal successful HTTP response even when the underlying AI generation failed, per the founder-approved safe-fallback design.
- A `Protocol`-based AI provider abstraction (`AnthropicProvider`, `NullProvider`, a `Settings`-driven factory), reusing the ingestion milestone's capability-protocol precedent (ADR-013).
- Three post-generation safety gates (structure, numeric integrity, advice language) that reject unsafe output outright — never sanitize, never return partially.
- A combined AI Safety Review and Red Team Review, finding no critical or high-severity issue and disclosing three residual, low-to-medium-severity risks as tracked technical debt (KI-032 through KI-034).
- 55 new tests (276 total project-wide), all passing — 38 network-free unit tests, 4 config-guard tests, 17 HTTP-integration tests against the real database.
- Four new ADRs, one new Founder Decision, this report, and updates to all seven Documentation Policy journals plus `docs/PROJECT_STATE.md`.

## Architecture

```
        Explain / Ask ───▶│  app.api.v1.services.  │
                          │  explanation_service    │  ← ownership/completion
                          │  (caching, caps, audit) │    checks, PII-free
                          └──────────┬──────────────┘    allowlist construction
                                     │
                          ┌──────────▼──────────────┐
                          │      app.ai.service      │  ← pure orchestration,
                          │ (prompt -> provider ->   │    no DB, no HTTP
                          │  safety gates -> result) │
                          └──────────┬──────────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     ▼                               ▼
          app.ai.providers.base           app.ai.safety
          (AIProvider Protocol)     (structure / integrity / advice checks)
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
   AnthropicProvider       NullProvider  (default, AI_PROVIDER=none)
```

- **`app/ai/prompt.py`**: two fixed, version-controlled system prompts (`EXPLANATION_PROMPT_VERSION`/`FOLLOWUP_PROMPT_VERSION`, both `"v1.0"`). No user-controlled text is ever concatenated into a system prompt — a follow-up question's raw text is placed only inside a delimited `QUESTION` block within the user turn, with the system prompt explicitly instructing the model to treat it as data. This is the platform's first prompt-injection defense, needed because the Financial Tutor is the first feature with any user-authored free text at all.
- **`app/ai/safety.py`**: `check_output_structure` (the six required sections present as `## <Name>` headers), `check_numeric_integrity` (every numeric token in the narrative traceable to `simulation_facts` within a 1%-relative/0.05-absolute tolerance, with small counting numbers 0–12 allowlisted), `check_advice_language` (a best-effort regex blocklist against directive investment-advice phrasing). All three are pure, deterministic, network-free functions.
- **`app/ai/service.py`**: `generate_explanation`/`generate_followup_answer` — build the prompt, call the provider, run every applicable gate, and append a fixed, **code-owned** Educational Disclaimer (never something the model is asked to produce — ADR-023, a deliberate hardening beyond the literal approved instruction).
- **`app/ai/providers/`**: `AIProvider` Protocol, `AnthropicProvider` (wraps the `anthropic` SDK, translates every `anthropic.AnthropicError` into `AIProviderUnavailableError`), `NullProvider` (the default, always raises the same error with zero network calls), and a `Settings`-driven factory — no other module imports the `anthropic` package.
- **API layer** (`app/api/v1/{schemas,services,routers}/explanations.py`): mirrors `simulation_service`/`auth_service`'s transaction-boundary discipline. `_build_simulation_facts` is the single, auditable allowlist deciding what `app.ai` ever sees — asset symbol, investment amount, dates (plus derived `start_year`/`end_year`/`duration_years`), simulation outputs, dividend/inflation flags — excluding email, display name, user ID, IP address, session ID, request ID, and auth information by construction.
- **Caching** (ADR-022): matches on `(simulation_id, explanation_type, model_name, prompt_version[, question_text])`. The Explanation Engine matches regardless of status (a prior failure is also "the stored explanation" until `regenerate=True` is passed, bounded by a regeneration cap); the Financial Tutor matches only `COMPLETED` rows, since it has no `regenerate` override.
- **Audit** (`app/api/v1/audit.py::record_ai_audit`): one row per generation attempt, success or failure, reusing `AuditEventType.AI_EXPLANATION_GENERATED`/`_FAILED` (reserved in the schema since M1) — SAVEPOINT-isolated, fail-open, mirroring `record_simulation_audit`/`record_auth_audit` exactly. Never includes the generated text, the raw question, or any offending fabricated value.

## Files Changed

**Created**: `backend/alembic/versions/0003_ai_explanation_type.py`; `backend/app/ai/{__init__,exceptions,prompt,safety,service}.py`; `backend/app/ai/providers/{__init__,base,anthropic_provider,null_provider}.py`; `backend/app/api/v1/schemas/explanations.py`, `services/explanation_service.py`, `routers/explanations.py`; `backend/tests/ai/` (5 files, 38 tests); `backend/tests/api/test_explanations.py` (17 tests); `backend/tests/core/test_ai_config.py` (4 tests); `docs/MILESTONE_REPORTS/M6_REPORT.md` (this file).

**Modified**: `backend/app/models/{enums,ai_explanation}.py`; `backend/app/api/v1/{__init__,dependencies,errors,audit,exception_handlers}.py`; `backend/app/core/config.py`; `backend/requirements.txt`; `backend/tests/api/conftest.py`; `.env.example`; `.claude/{SECURITY_POLICY,DATABASE_RULES}.md`; `docs/{FOUNDER_DECISIONS,ARCHITECTURE_DECISIONS,KNOWN_ISSUES,DEVLOG,CHANGELOG,SECURITY_LOG,TESTING_REPORT,PERFORMANCE_LOG,PROJECT_STATE}.md`.

## Tests

**276/276 passing** (221 from M0–M5 + 55 new). 38 non-DB unit tests (safety gates, prompt construction, service orchestration against a fake provider, the Anthropic adapter against a mocked SDK client — zero real network calls, zero real API key needed anywhere), 4 config-guard tests, 17 HTTP-integration tests (cache hits, regeneration/follow-up caps, ownership/completion checks, audit logging, and the safe-fallback path exercised through the real default `NullProvider` configuration end-to-end).

Notable results:
- `test_create_explanation_with_no_provider_returns_safe_fallback` / `test_followup_question_with_no_provider_returns_safe_fallback`: prove the founder-approved safe message is returned as a normal `201` response — not an error — through the real default configuration, no mocking at all.
- `test_generate_explanation_rejects_fabricated_numbers` / `..._rejects_advice_language`: prove the two most safety-critical gates actually block generation, not just that the check functions return the right boolean in isolation.
- `test_second_call_without_regenerate_is_served_from_cache`: proves a cache hit never re-invokes the provider (via a call counter on the fake provider) — the test that caught this milestone's one real design bug (see below) before it shipped.
- `test_regeneration_cap_returns_429` / `test_followup_cap_returns_429`: prove both cost-control caps actually reject once exceeded, not just that the count is computed correctly.
- `test_explanation_audit_log_written_on_success`: proves the generated text never leaks into the audit trail — a direct, not just documented, privacy guarantee.

## Security Review

Full AI Safety Review and Red Team Review in `docs/SECURITY_LOG.md`'s M6 entry. Summary: no critical or high-severity finding. Three residual risks found and **documented as tracked debt**, not fully closed: KI-032 (the heuristic numeric-integrity/advice-language checks are not exhaustive — the most consequential open item from this milestone), KI-033 (a low-severity cap-check race under genuine concurrency, mirroring the already-accepted KI-012/KI-027 precedent), KI-034 (an unverified assumption that Anthropic echoes back the exact requested model string, affecting cache efficiency only, never correctness or safety).

## Founder Specification Compliance

| Decision | Status |
|---|---|
| AI never calculates, modifies, forecasts, recommends, or invents a financial fact (Part 2.7.3/2.7.5) | Enforced structurally — `app.ai` has no import path to `app.simulation` or any write-capable session |
| Explanation Engine covers ROI, CAGR, inflation adjustment, dividends, time horizon | Implemented via the six required sections, populated from `simulation_facts` only |
| Financial Tutor: scoped follow-ups, no long-term/cross-user memory, no unrelated advice | Implemented — every call is stateless and scoped to one simulation; advice language is checked and rejected |
| Required output structure (Summary through Educational Disclaimer) | Implemented — six sections model-generated and structure-checked; Educational Disclaimer code-appended (ADR-023) |
| Privacy: no email/display name/user ID/IP/session ID/request ID/auth info to the provider | Implemented — `_build_simulation_facts` is a strict, auditable allowlist |
| Provider abstraction, Anthropic first, `NullProvider` fallback | Implemented exactly as specified (Part 2.7.15, Founder Decision 003) |
| Caching (unchanged simulation+prompt+model returns stored explanation) | Implemented (ADR-022), with a documented asymmetry between the two features |
| Regeneration cap, follow-up cap, max output tokens | Implemented — all three configurable via `Settings` |
| Model/prompt/input tracking | Implemented — already schema-supported since M1, populated on every row |
| AI integrity check (numbers/percentages/dollar amounts match, no fabricated values) | Implemented (`app.ai.safety`) — rejects outright, never sanitizes |
| AI availability (safe fallback message, simulation unaffected) | Implemented — literal founder-approved text, returned as a successful response |
| Frontend, portfolio simulation, advanced analytics, RAG, Historical Event Database | Explicitly excluded, per direct instruction |
| Simulation Engine unmodified | Verified — zero files under `app/simulation/` touched; full pre-M6 suite (221 tests) unchanged and passing |

## Technical Debt

| ID | Item | Status |
|---|---|---|
| KI-032 | Heuristic safety-check coverage gaps (numeric integrity, advice language) | Open — most consequential open item from this milestone |
| KI-033 | Regeneration/follow-up cap-check TOCTOU race under genuine concurrency | Open — low severity, mirrors KI-012/KI-027 |
| KI-034 | Unverified assumption that Anthropic echoes back the exact requested model string | Open — cost-inefficiency risk only, not correctness/safety |

## Production Readiness

**6/10** for the Educational AI System specifically — fully tested against the default (`NullProvider`) and a fake-provider success path, structurally safe against every named prohibited behavior, but never verified against a real Anthropic API call (no live key available this session) and carrying two low-severity, already-precedented residual risks. Platform-wide readiness remains gated primarily on KI-016 (carried from M3) and the still-unbuilt Frontend/Deployment milestones.

## Recommended Next Milestone

**M7 — Frontend (Next.js)**, per the approved MVP build order — the Simulation Engine, API, Identity Management, and now the Educational AI System are all stable and tested, satisfying the standing "backend before frontend" rule. Before or alongside M7: verify the Educational AI System against a real Anthropic API key (closing KI-034 and this milestone's one open performance question) — a low-cost verification step, not a redesign.
