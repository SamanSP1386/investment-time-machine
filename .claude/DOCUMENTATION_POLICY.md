# DOCUMENTATION_POLICY.md

Documentation is part of the product, not an afterthought. **A milestone is not complete until every required document below has been updated** — this is now an explicit clause of the Definition of Done in [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md). Outdated documentation is a defect, tracked the same way a bug would be.

## General rules (apply to every document listed below)

- Never delete historical information. Never overwrite a previous entry. Always append.
- Keep documentation synchronized with the actual implementation — if they disagree, the code is not "done."
- Every engineering decision must be traceable to an entry in one of these documents.
- Write as if a new engineer will inherit the project with no other context: explain what was built, why, how it works, and why the decision was made the way it was — not just what changed.

## Required documents (must always exist in `docs/`)

| Document | Purpose | Update cadence |
|---|---|---|
| `DEVLOG.md` | Permanent engineering journal | One appended entry per completed milestone |
| `CHANGELOG.md` | Semantic version history (Added/Changed/Fixed/Removed/Deprecated/Security) | One entry per release |
| `KNOWN_ISSUES.md` | All unresolved (and resolved-but-retained) issues | Updated whenever an issue is found, changes status, or is resolved |
| `ARCHITECTURE_DECISIONS.md` | ADRs for every significant engineering decision | New ADR whenever a significant decision is made; superseding ADRs for changed decisions, never edits |
| `SECURITY_LOG.md` | Security review record | One entry per milestone |
| `TESTING_REPORT.md` | Testing quality record | One entry per milestone |
| `PERFORMANCE_LOG.md` | Performance over time | One entry per milestone |

### DEVLOG.md entry fields (all required, every milestone)

Date, Milestone, Version, Objective, Scope, Implementation Summary, Files Created, Files Modified, Architecture Decisions, Problems Encountered, Solutions, Lessons Learned, Security Review Summary, Testing Summary, Technical Debt Introduced, Performance Notes, Recruiter Value, Production Readiness Score, Next Milestone.

### ARCHITECTURE_DECISIONS.md ADR fields (all required, every ADR)

ADR Number, Title, Date, Status, Context, Problem, Options Considered, Final Decision, Rationale, Tradeoffs, Future Implications. If a decision changes, write a new ADR that supersedes the old one — never edit the superseded ADR itself, only mark its Status as "Superseded by ADR-NNN."

### KNOWN_ISSUES.md issue fields (all required)

ID, Description, Severity, Status, Planned Resolution, Resolution Date (once fixed — the issue stays in the document, it is not deleted).

### SECURITY_LOG.md entry fields (all required, every milestone)

Risks Found, Severity, Mitigations Implemented, Remaining Risks, Threats Deferred.

### TESTING_REPORT.md entry fields (all required, every milestone)

Unit Tests, Integration Tests, Security Tests, Performance Tests, Coverage, Failed Tests, Fixes Applied.

### PERFORMANCE_LOG.md entry fields (all required, every milestone)

API Response Time, Database Query Time, Memory Usage, Startup Time, Performance Bottlenecks, Optimizations, Future Improvements.

## Do not

- Do not edit or delete a prior DEVLOG/CHANGELOG/ADR/SECURITY_LOG/TESTING_REPORT/PERFORMANCE_LOG entry to "clean it up." History is the point.
- Do not mark a milestone done in [DEVLOG.md](../docs/DEVLOG.md) if any of the seven required documents wasn't touched for it — even a "no change" milestone still gets an entry saying so.
- Do not let a KNOWN_ISSUES.md entry disappear on resolution — set its Status and Resolution Date, keep the entry.
