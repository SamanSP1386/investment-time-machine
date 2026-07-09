# REVIEW_CHECKLIST.md

## Definition of Done (verbatim, Founder Specification 3.9.17)

> A task is complete only when: Implementation finished; Tests pass; Documentation updated; Errors handled; Code reviewed; Deployment validated. Implementation alone does not equal completion.

Every PR, every milestone, every "done" claim is measured against all six items above — not just "it runs."

**"Documentation updated" is not satisfied by a docstring.** Per [DOCUMENTATION_POLICY.md](DOCUMENTATION_POLICY.md), a milestone is not complete until `docs/DEVLOG.md`, `docs/CHANGELOG.md`, `docs/SECURITY_LOG.md`, `docs/TESTING_REPORT.md`, and `docs/PERFORMANCE_LOG.md` all have a new appended entry for it, `docs/KNOWN_ISSUES.md` reflects any issue found/changed/resolved, and `docs/ARCHITECTURE_DECISIONS.md` has a new ADR for any significant decision made. A milestone with code merged but no DEVLOG entry is not done.

## Code review priority order (Part 3.9.15 / 2.18.7 — identical in both sections)

1. **Correctness** — does it produce the right result, including edge cases?
2. **Security** — does it introduce or fail to close a threat from [SECURITY_POLICY.md](SECURITY_POLICY.md)?
3. **Maintainability** — will the next person (human or AI agent) understand and safely change this?
4. **Performance** — does it meet [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md), and only after 1–3 are satisfied?
5. **Style** — last, and only enforced where it aids the above.

## PR checklist

- [ ] No business/financial logic in route handlers (service layer only).
- [ ] No `float`/`REAL`/`DOUBLE PRECISION` touching a financial value anywhere in the diff.
- [ ] Any schema change is an Alembic migration — no manual DDL.
- [ ] Any Simulation Engine change includes updated/new known-answer tests.
- [ ] Any endpoint accepting user input has a negative/invalid-input test.
- [ ] No secret, API key, or credential appears in the diff (grep before pushing).
- [ ] Response payloads follow the `{"success": ..., "data"/"error": ...}` envelope.
- [ ] Docs updated for any DB schema, API contract, deployment, or migration-procedure change (see [CODING_STANDARDS.md](CODING_STANDARDS.md)).
- [ ] AI service changes: confirm no path lets the AI compute, alter, or "correct" a financial figure.
- [ ] Coverage target for the touched component (see [TESTING_GUIDELINES.md](TESTING_GUIDELINES.md)) is met or the shortfall is explicitly called out with a reason.
- [ ] Anything left unfinished is documented as *intentional, temporary, tracked* technical debt (see below) — not silent.
- [ ] Before claiming "CI will pass" or "the suite is green": reproduce each CI job's exact steps from `.github/workflows/ci.yml`, in order, in an environment matching its constraints (no `.env.local`, a fresh/empty database if the workflow provisions one, the pinned tool/runtime versions) — not the closest local dev-loop command. `ruff check <changed files>` is not `ruff check .`; a local `npm run build` with `.env.local` present is not CI's `npm run build`. `main` was red for 8 consecutive commits (`docs/KNOWN_ISSUES.md` KI-046) specifically because this substitution went unnoticed.
- [ ] `docs/DEVLOG.md`, `docs/CHANGELOG.md`, `docs/SECURITY_LOG.md`, `docs/TESTING_REPORT.md`, `docs/PERFORMANCE_LOG.md` each have a new appended entry for this milestone (see [DOCUMENTATION_POLICY.md](DOCUMENTATION_POLICY.md)).
- [ ] `docs/KNOWN_ISSUES.md` updated if any issue was found, changed status, or was resolved.
- [ ] `docs/ARCHITECTURE_DECISIONS.md` has a new ADR for any significant decision made this milestone (never edit a prior ADR — supersede it).

## Technical debt policy

Debt is acceptable only when documented, intentional, and temporary. An undocumented shortcut is a bug, not debt. When you knowingly defer something (e.g. filling one of the spec's own gaps — see [SYSTEM.md](SYSTEM.md) Known Specification Gaps), say so explicitly in the PR description and note it in the relevant `.claude/*.md` file if it'll recur.

## Reviewer note for AI coding agents specifically

Per Part 3.8/3.9: an AI agent must not — redesign architecture without approval, introduce an unlisted framework/technology, remove input validation, bypass testing, generate fake financial data, or store secrets in source. If a conflict exists between generated code and the Founder Specification, **the Founder Specification wins**; stop and ask rather than resolve it unilaterally.
