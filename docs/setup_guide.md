# Setup Guide

Covers M0 only: the repository/environment foundation. No database models, ingestion, simulation logic, auth, or frontend exist yet — see [.claude/MVP_RULES.md](../.claude/MVP_RULES.md) for the full build order.

## Prerequisites

- Docker and Docker Compose
- Python 3.12+ (only needed if running the backend outside Docker)

## Option A — Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up --build
```

This starts Postgres and the backend. Verify it's healthy:

```bash
curl http://localhost:8000/health
# {"success":true,"data":{"status":"healthy"}}
```

## Option B — Run the backend locally (Postgres still via Docker)

```bash
docker compose up -d postgres

cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt

cp ../.env.example ../.env        # or export DATABASE_URL directly

uvicorn app.main:app --reload
```

## Running tests

```bash
cd backend
pytest
```

## Linting and formatting

```bash
cd backend
ruff check .
black --check .      # add --check-free / drop --check to auto-format
```

## Pre-commit hooks (run automatically on every commit)

```bash
pip install pre-commit
pre-commit install
```

This runs ruff, black, and a gitleaks secret scan before each commit — the same checks CI runs, so failures are caught locally first.

## Alembic

Alembic is initialized (`backend/alembic/`) but there are no models or migrations yet — that begins in the Database Schema milestone. `alembic.ini` reads the database connection from `DATABASE_URL` via `app.core.config.Settings`, not from a hardcoded value.

## Environment variables

See `.env.example` for the full list. `JWT_SECRET`, `AI_PROVIDER_API_KEY`, and `REDIS_URL` are reserved names for future milestones (Auth, AI Explanations, and API/rate-limiting respectively) — do not set them yet, they're not read by anything in M0.
