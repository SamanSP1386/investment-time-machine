# SECURITY_POLICY.md

Distilled from Founder Specification Part 2.8 (Security Architecture) and Part 3.6 (Threat Modeling). Philosophy: "Simple Security First" — controls proportional to actual risk, not banking-grade complexity, but never skipped where a real threat exists.

## Threat model (Part 3.6) — ranked, with mandated mitigations

| Threat | Impact | Likelihood | Mandated mitigation |
|---|---|---|---|
| Incorrect simulation results | Critical | Medium | Known-answer tests, formula validation, code review, regression tests, determinism |
| Corrupted historical data | Critical | Medium | Validation layer, import verification, duplicate detection, source attribution, audit log |
| AI hallucinated financial facts | Critical | Medium | AI cannot calculate results; structured inputs only; prompt controls; input auditing |
| Credential stuffing | High | Medium | Argon2 hashing, rate limiting, account lockout (MFA deferred — explicit, accepted gap) |
| API abuse | Medium | High | Rate limiting, request validation, caching, monitoring |
| Secret exposure | Critical | Medium | Env-var-only secrets, isolation, repo scanning, access control |
| Database failure | Critical | Low | Automated backups, recovery procedures, monitoring, hosting redundancy |
| Data loss | Critical | Low | Daily backups, source control, periodic recovery testing |
| Malicious data import | High | Low | Validation pipeline, schema checks, import auditing, source attribution |
| Unauthorized admin access | Critical | Low | RBAC, least privilege, audit logging, admin monitoring |
| Deployment failure | High | Medium | Staging validation, rollback strategy, deployment monitoring |
| Provider outage | Medium | Medium | Local data ownership, provider abstraction, failure isolation |
| Documentation drift | Medium | High | Documentation-first workflow, review requirement, Definition of Done |

**Explicitly named future threats with NO mitigation defined yet** (do not assume these are handled): prompt injection, data poisoning, model manipulation, supply chain attacks, social engineering, advanced credential theft. Prompt injection in particular is live risk *now* — the AI explanation feature ships in MVP and ingests user-influenced text (asset names, historical event context). Treat any user-influenced text reaching the AI service as untrusted input requiring sanitization, even though the spec doesn't say so explicitly.

## Mandatory controls

- **Passwords**: Argon2 (bcrypt acceptable fallback only with a documented reason). Never store plaintext.
- **Roles**: exactly two at MVP — Standard User, Administrator. No finer-grained RBAC until justified by scale.
- **Secrets**: environment variables only. Never in source, commit history, or documentation. Separate DB credentials for app vs. admin/migration access.
- **Rate limits (starting values, tune as needed)**: simulation 60/min, auth 10/min, AI 20/min.
- **Backups**: daily automated (PostgreSQL + historical data + migration history). RTO = 24h, RPO = 24h for MVP.
- **Transport**: HTTPS everywhere. No direct database access from the frontend — all access mediated by the backend API.
- **AI isolation**: AI service authenticates to a mediating application service, never to the database or infra credentials directly (see [SYSTEM.md](SYSTEM.md) service boundaries).
- **Audit logging**: required for login attempts, admin actions, data imports, AI generations. Redact sensitive values before writing to `audit_logs.details` (JSONB) — enforce via a shared serialization helper, not per-call-site discipline.

## Known gaps — resolve before the relevant milestone starts, do not silently default

- ~~**Token/session lifecycle is completely unspecified**~~ — **Resolved at M5** via Founder Decision 002 (`docs/FOUNDER_DECISIONS.md`): 15-minute JWT access token, 30-day rotating opaque refresh token with reuse detection, both in httpOnly/`SameSite=Strict` cookies. See ADR-017/ADR-018 (`docs/ARCHITECTURE_DECISIONS.md`) and `docs/KNOWN_ISSUES.md` KI-006.
- **No CORS policy, CSP, or security headers specified.** Set explicit allow-listed origins via `CORS_ALLOWED_ORIGINS`; add baseline security headers (CSP, HSTS, X-Content-Type-Options) even though the spec doesn't mention them — omission is a spec gap, not permission to skip.
- **No secret-scanning tool named.** Add a pre-commit/CI secret scanner (e.g. gitleaks) before the first real credential exists in the repo — Part 2.18 defers CI/CD but a secret scanner is cheap enough to add immediately regardless.
- **No password reset/account recovery flow specified.** **Superseded at M5 by explicit founder instruction** (Founder Decision 002): password reset is deliberately deferred past M5, not built alongside registration/login/refresh/logout — this overrides this file's prior "before Auth milestone completion" recommendation for M5's scope specifically. It must still ship before any production launch — tracked in `docs/KNOWN_ISSUES.md` — just not as part of Identity Management's first milestone.
- **No backup encryption or backup-access-control policy specified.** Encrypt backups at rest and restrict access equivalently to production DB credentials.
- **Rate limiting is numbers-only, no enforcement layer named.** Implement via ASGI middleware + Redis; if Redis is skipped at MVP (it's optional per infra spec), you have no rate limiting — treat this as a blocking dependency, not an independent "optional" choice (see [PERFORMANCE_BUDGET.md](PERFORMANCE_BUDGET.md) note on Redis).

## Do not

- Do not let the AI service compute, alter, or "correct" any financial figure, ever, under any framing ("just formatting the number," "rounding for readability" is fine; deriving a new number is not).
- Do not treat MFA, advanced RBAC, or IP-reputation filtering as MVP requirements — they are explicitly deferred. Don't build them speculatively.
- Do not grant the frontend, or any client, direct database credentials under any circumstance.
