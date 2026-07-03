# GIT_WORKFLOW.md

From Founder Specification Part 2.18 (Engineering Workflow Architecture).

## Branching (MVP / solo-developer mode)

`main` + `feature/*`. `develop`, `hotfix/*`, and `release/*` are explicitly future-state — do not introduce them prematurely; they add process overhead a solo developer doesn't need yet.

## Commits and PRs

- Descriptive commit messages, small PRs, atomic changes (one logical change per PR).
- Every PR is measured against the Definition of Done in [REVIEW_CHECKLIST.md](REVIEW_CHECKLIST.md) before merge.

### Conventional Commits (mandatory prefix on every commit)

`feat:` new functionality · `fix:` bug fix · `refactor:` no behavior change · `test:` test-only change · `docs:` documentation-only change · `chore:` tooling/config/dependency change · `perf:` performance improvement.

Example: `feat: add dividend reinvestment toggle to simulation engine`. This is an addition to the source spec (which doesn't mandate a commit convention) adopted for consistency and changelog-friendliness — not a founder-spec requirement, but not in tension with one either.

## Database migrations — the only path for schema change

1. Design the change.
2. Generate an Alembic migration.
3. Review it (self-review acceptable solo, but read the generated SQL, don't rubber-stamp).
4. Commit it alongside the code that needs it.
5. Apply to staging.
6. Validate on staging.
7. Apply to production.
8. Monitor after deploy.

No direct schema edits outside this flow, ever — not even "just this once" in a hotfix.

## Deployment triggers — resolved ambiguity

The source spec names two production deploy triggers ("merge to main" and "tagged release") without reconciling them. Resolved convention for this project: **merge to `main` auto-deploys to staging; a tagged release (`vX.Y.Z`) deploys to production.** This gives a deliberate production gate without inventing a `develop` branch. Revisit if the founder specifies otherwise.

## CI/CD

Explicitly deferred in the source spec ("future workflow expansion"). Practical exception: wire up GitHub Actions to run tests + a secret scanner (e.g. gitleaks) from the very first milestone — these are cheap, catch real problems early, and don't require the fuller CI/CD maturity (coverage gates, staged deploy automation) the spec is deferring. See the recommended first coding milestone.

## Documentation ownership

Whoever changes a system updates its docs in the same PR — schema docs, API docs (OpenAPI, mostly auto-generated), deployment docs, migration procedures. Documentation drift is itself a named threat in the spec's threat model (Part 3.6) with no tooling mitigation defined — the only defense is this rule, actually followed.

## Do not

- Do not skip the staging step for any schema migration, regardless of how small it looks.
- Do not introduce `develop`/`release`/`hotfix` branches speculatively — wait until team size or release cadence actually demands them.
