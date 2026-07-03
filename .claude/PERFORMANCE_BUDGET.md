# PERFORMANCE_BUDGET.md

From Founder Specification Part 3.4 (Non-Functional Requirements) and Part 2.14/2.15. **Correctness always outranks speed** — never trade a correctness guarantee for a performance target; the spec says so explicitly for the Simulation Engine and it generalizes to the whole platform (see engineering priority order in [SYSTEM.md](SYSTEM.md)).

## Latency targets (MVP)

| Operation | Target |
|---|---|
| Asset search | <250ms |
| Historical data retrieval | <500ms |
| Auth request | <500ms |
| Simulation creation (API round-trip) | <500ms |
| Single simulation (calculation itself) | <2s |
| Asset comparison | <3s |
| AI explanation generation | <15s |
| Frontend page load | <3s |
| Database query | <100ms |

## Availability

- MVP target: 99% uptime.
- Future target: 99.9%.
- RTO / RPO: 24 hours each at MVP (daily backups are the floor — see [SECURITY_POLICY.md](SECURITY_POLICY.md)).

## Cost ceiling (a performance/scale constraint, not a separate concern)

MVP infrastructure spend target: **$0–$10/month** (Vercel free tier, Railway/Render free-to-$5 tier, Sentry free tier). Do not introduce infrastructure (managed Redis, read replicas, background workers, CDN) that breaks this ceiling without an explicit, founder-approved reason tied to a measured need — not a hypothetical one.

## Known tension — flag, don't silently resolve

Cost Architecture (Part 2.23) caps MVP spend at $0–$10/month while Disaster Recovery (Part 2.24) requires daily automated backups as a floor requirement — many free-tier Postgres offerings do not include automated backups. If the chosen host's free tier doesn't include this, either budget for the paid tier that does, or implement a scripted backup job (e.g. `pg_dump` to object storage) yourself. Don't assume the free tier silently satisfies the backup requirement — verify it.

## Scaling triggers (Part 2.22) — do not act until a metric crosses these, and do not wait past them either

Stage 1 (0–1K users): single backend instance, single Postgres instance, Redis optional.
Stage 2 (1K–10K): multiple backend instances, Redis required, background workers introduced.
Stage 3 (10K–100K): read replicas, connection pooling, partitioning considered.
Stage 4 (100K+): explicitly out of MVP planning scope — do not design for this now.

Scaling priority order, always: **Correctness > Reliability > Performance > Cost.** DB scaling order specifically: query optimization → indexing → read replicas → partitioning → advanced architecture (last resort, not a starting point).

## Do not

- Do not add caching, read replicas, or background workers speculatively "for scale" before Stage 2 triggers are actually observed.
- Do not treat the AI explanation 15s budget as license to skip timeout/failure handling — AI failure must never block simulation completion (see [SYSTEM.md](SYSTEM.md)).
