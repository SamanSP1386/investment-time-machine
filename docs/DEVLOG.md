# DEVLOG.md

Permanent engineering journal. One entry is appended per completed milestone. **Never modify a previous entry — only append.** See [.claude/DOCUMENTATION_POLICY.md](../.claude/DOCUMENTATION_POLICY.md) for the policy governing this file.

---

## 2026-07-02 — M0: Repository & Environment Foundation

**Version**: 0.1.0

**Objective**: Establish a working, disciplined repository foundation — local dev loop, migrations tooling, and CI — that every later milestone builds on, without any product logic yet.

**Scope**: Backend FastAPI skeleton, PostgreSQL via Docker Compose, Alembic initialized (no models), `/health` endpoint, pytest smoke test, ruff/black/pre-commit, GitHub Actions CI with gitleaks secret scanning, `.env.example`, `.gitignore`, setup guide. Explicitly excluded from scope: database models, ingestion, simulation logic, auth, frontend logic, Redis.

**Implementation Summary**: Built a minimal FastAPI app (`app/main.py`) backed by a `pydantic-settings`-based Core Configuration Layer (`app/core/config.py`, `app/core/logging.py`) that centralizes all environment-variable reads and startup logging — no module reads `os.environ` directly outside this layer, and FastAPI `Depends` is the intended DI mechanism going forward. Alembic was initialized pointed at `DATABASE_URL` via `Settings`, with `target_metadata = None` as an explicit placeholder until the Database Schema milestone introduces models. Docker Compose defines Postgres and the backend only — Redis was deliberately left out (see ADR-004 in `ARCHITECTURE_DECISIONS.md`). CI runs ruff, black --check, pytest, and a gitleaks secret scan on every push/PR; pre-commit mirrors the same checks locally.

**Files Created**: `backend/app/main.py`, `backend/app/core/config.py`, `backend/app/core/logging.py`, `backend/app/__init__.py`, `backend/app/core/__init__.py`, `backend/tests/test_health.py`, `backend/tests/__init__.py`, `backend/pyproject.toml`, `backend/requirements.txt`, `backend/requirements-dev.txt`, `backend/Dockerfile`, `backend/alembic.ini`, `backend/alembic/env.py`, `backend/alembic/script.py.mako`, `backend/alembic/versions/.gitkeep`, `docker-compose.yml`, `.pre-commit-config.yaml`, `.github/workflows/ci.yml`, `.env.example`, `.gitignore`, `docs/setup_guide.md`.

**Files Modified**: `.claude/SYSTEM.md` (Redis wording), `.claude/CODING_STANDARDS.md` (tooling + Core Configuration Layer section), `.claude/GIT_WORKFLOW.md` (Conventional Commits), `.claude/MVP_RULES.md` (Financial Analytics milestone split).

**Architecture Decisions**: See `ARCHITECTURE_DECISIONS.md` ADR-001 through ADR-007 (deploy trigger resolution, `calculation_version` non-negotiable, nullable output columns, Redis deferral, Conventional Commits adoption, Auth-before-Frontend reordering, Financial Analytics milestone split). ADR-004 and ADR-005 were made during this milestone; ADR-001, 002, 003, 006, 007 were made during the preceding architecture-review pass and are logged here retroactively per the new documentation policy.

**Problems Encountered**: (1) `ruff` flagged an unsorted import block in `alembic/env.py`. (2) No Docker daemon available in the working sandbox, so `docker compose up` could not be executed end-to-end in this session.

**Solutions**: (1) Fixed via `ruff check --fix .`, re-verified clean. (2) Backend verified independently instead — dependencies installed into a local venv, `ruff check .`, `black --check .`, and `pytest -v` all run and passed directly against the FastAPI app; `docker-compose.yml` and `Dockerfile` follow a standard, widely-used pattern but a real `docker compose up --build` pass is still owed before M1 begins (tracked as KI-001).

**Lessons Learned**: Wiring CI + pre-commit + secret scanning at commit #1, rather than deferring them as "future workflow expansion" (as the Founder Specification itself allows), costs almost nothing and closes the "Documentation Drift" / "Secret Exposure" threat-model gaps before any real secret or feature exists to leak.

**Security Review Summary**: See `SECURITY_LOG.md` M0 entry. No secrets committed; gitleaks active in CI and pre-commit; all configuration flows through `Settings`.

**Testing Summary**: See `TESTING_REPORT.md` M0 entry. 1 unit test (`test_health_check_returns_success`), 1/1 passing, 100% coverage of the only endpoint that exists.

**Technical Debt Introduced**: `alembic/env.py` has `target_metadata = None` — documented, intentional, temporary placeholder until the Database Schema milestone. No other debt introduced.

**Performance Notes**: See `PERFORMANCE_LOG.md` M0 entry. No meaningful performance surface yet (single health-check endpoint, no DB queries).

**Recruiter Value**: Medium. Demonstrates Docker/CI/tooling discipline from the first commit — the foundation that makes later, higher-value milestones (Simulation Engine, Data Ingestion) credible rather than ad hoc. Not itself a differentiator.

**Production Readiness Score**: 2/10 — appropriate for a foundation milestone with zero product logic. Blocking items before this number moves: real database schema (M1), and a verified (not just authored) Docker Compose run (KI-001).

**Next Milestone**: M1 — Database Schema & Migrations.
