# Setup Guide

Covers M0 (repository/environment foundation), M1 (database schema & migrations), and M2 (data ingestion pipeline). No simulation logic, auth, or frontend exist yet — see [.claude/MVP_RULES.md](../.claude/MVP_RULES.md) for the full build order.

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

`backend/alembic/versions/0001_initial_schema.py` creates the nine Founder Specification database domains (ten tables — Economic Indicators is a catalog + time-series pair). Apply it with:

```bash
cd backend
alembic upgrade head
```

`alembic.ini` reads the database connection from `DATABASE_URL` via `app.core.config.Settings`, not from a hardcoded value. To roll back: `alembic downgrade base`.

### Running tests will downgrade your dev database — read this before running `pytest`

`tests/test_migrations.py` applies the migration to whatever `DATABASE_URL` points at, diffs it against the models, and **downgrades back to base** as part of the test (this is intentional — it proves the migration and models never drift). If you run `pytest` locally against the same `itm_dev` database from `docker compose up`, your dev database will end up schema-less afterward.

Two options:
- Re-run `alembic upgrade head` after running tests, if you want the dev DB populated with tables for manual poking.
- Point `DATABASE_URL` at a separate scratch database when running tests locally (matching what CI does with `itm_test`), e.g. `DATABASE_URL=postgresql://itm_user:itm_password@localhost:5432/itm_test pytest` — you'll need to create that database once (`createdb itm_test` inside the postgres container, or via any Postgres client).

CI already isolates this correctly (`.github/workflows/ci.yml` provisions a dedicated `itm_test` Postgres service) — this only affects local runs. Tracked as `docs/KNOWN_ISSUES.md` KI-008.

## Data Ingestion (M2)

Trigger an import manually via the CLI (not an API endpoint — no HTTP, no auth):

```bash
cd backend
python -m app.ingestion.cli prices AAPL --provider yfinance --start 2020-01-01 --end 2024-01-01
python -m app.ingestion.cli prices AAPL --provider yfinance --start 2020-01-01 --end 2024-01-01 --dry-run
python -m app.ingestion.cli indicator CPIAUCSL --provider fred --name "CPI for All Urban Consumers" --unit index --start 2020-01-01 --end 2024-01-01
```

FRED requires a free API key (`FRED_API_KEY` in `.env`) — get one at https://fred.stlouisfed.org/docs/api/api_key.html. yfinance and CoinGecko need no key. `--dry-run` downloads, validates, and normalizes without writing to the database.

### If yfinance fails locally (e.g. `Expecting value: line 1 column 1`) — seeding fixture data for manual testing

`yfinance==0.2.44`'s internal crumb/cookie negotiation can get rate-limited (HTTP 429) by Yahoo, breaking ingestion for every symbol identically, inside or outside Docker (root-caused and tracked as `docs/KNOWN_ISSUES.md` KI-044). This is **not** a Docker networking issue and there is no header/config fix for it — it clears on its own once the rate limit resets, on an unpredictable schedule.

To unblock **manual frontend/Simulator testing** without waiting on that, use `--provider dev_seed` — a small, deterministic, clearly-synthetic fixture provider built for exactly this:

```bash
cd backend
python -m app.ingestion.cli prices AAPL --provider dev_seed --asset-type stock --start 2020-01-01 --end 2024-12-31
python -m app.ingestion.cli prices SPY  --provider dev_seed --asset-type etf   --start 2020-01-01 --end 2024-12-31
python -m app.ingestion.cli prices BTC-USD --provider dev_seed --asset-type crypto --name "Bitcoin (dev seed)" --start 2020-01-01 --end 2024-12-31
```

**`dev_seed` is development/test only, and its data must never be treated as real provider data:**

- It only serves three fixed symbols (`AAPL`, `SPY`, `BTC-USD`) at deliberately round, obviously-fake price levels (e.g. AAPL starts at $100.00) — it never attempts to approximate real historical prices, so nobody could mistake it for real market data even seen out of context.
- Every asset it creates is stamped `data_source = "dev_seed"` in the database — the same column real providers populate — never disguised as `"yfinance"` or `"coingecko"`. Check `GET /api/v1/assets/{symbol}` and confirm `data_source` before trusting any local data as "real."
- It refuses to run (raises at construction) unless `ENVIRONMENT` is `development`, `test`, or `testing` — it cannot be reached in a production deployment, even by mistake.
- It goes through the exact same normalization/validation/repository/audit pipeline every real provider does (see ADR-035) — it is not a raw SQL insert or a bypass of ingestion's own correctness checks, only a different source of raw records.

**If a symbol already exists in your local DB from an earlier failed `yfinance`/`coingecko` attempt**, `get_or_create_asset` will *not* update its `data_source` — it only sets that column when the row is first created. If you seed a symbol that already has a stale `Asset` row from a previously-failed real-provider attempt, check `data_source` after seeding; if it still shows the old provider name instead of `"dev_seed"`, you'll need to delete that asset's rows (`historical_prices`, `dividends`, `stock_splits`, then `assets`) and re-run the seed command so the label is set correctly on creation. See ADR-035's "Tradeoffs" section for the full explanation.

## Environment variables

See `.env.example` for the full list. `FRED_API_KEY` and `INGESTION_HTTP_TIMEOUT_SECONDS` are read starting at M2. `JWT_SECRET`, `AI_PROVIDER_API_KEY`, and `REDIS_URL` are reserved names for future milestones (Auth, AI Explanations, and API/rate-limiting respectively) — do not set them yet, they're not read by anything through M2.
