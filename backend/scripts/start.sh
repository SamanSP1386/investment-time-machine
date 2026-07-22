#!/bin/sh
# Container entrypoint (backend/Dockerfile's CMD) — Milestone 8 follow-up.
#
# Render's free tier has no Shell/One-Off Jobs access, so the one-time
# production migration + starter-catalog ingestion (previously a manual
# founder step via Render's Shell tab, docs/DEPLOYMENT.md) has to happen
# automatically on container boot instead. Three steps, in order:
#
#   1. alembic upgrade head       — always runs, every boot. Idempotent
#                                    (no-ops once already at head); must be
#                                    fatal on failure (`set -e`, no `|| true`)
#                                    since starting the API against a
#                                    stale/broken schema would be worse than
#                                    not starting at all.
#   2. seed_real_catalog, IF EMPTY — a real DB query
#      (app.ingestion.catalog_status), not an env flag: the check
#      self-disables the instant a real asset row exists, so redeploys
#      after the first successful run never re-fetch or duplicate. Best
#      effort, not fatal: if Yahoo is rate-limited (docs/KNOWN_ISSUES.md
#      KI-044) the API still starts — the assets table stays empty, so the
#      next boot/redeploy retries automatically.
#
#      Wrapped in `timeout` (production incident: this step hung on Render
#      for 5+ minutes with no uvicorn port ever opened, until Render's own
#      "no open ports detected" deploy timeout killed the whole deploy).
#      YahooChartProvider's own per-request timeout+retry
#      (app/ingestion/providers/yahoo_chart_provider.py) bounds each *single*
#      HTTP call, but 10 symbols x up to 3 calls each (prices/dividends/
#      splits, see app.ingestion.orchestrator.import_asset — attempted
#      unconditionally per symbol, never short-circuited by a prior
#      failure) has no *aggregate* ceiling: 30 calls x a ~10s timeout alone
#      is ~5 minutes, and a sustained 429 (KI-044) makes each call retry
#      with backoff instead, well past that. `seed_real_catalog` writes
#      everything in one transaction (see app/ingestion/seed_real_catalog.py
#      -> session_scope), so `timeout` killing it mid-run commits nothing —
#      the assets table stays genuinely empty, and the same
#      `catalog_status` check safely retries the whole run from scratch on
#      the next boot, exactly like a clean failure.
#   3. uvicorn, via `exec`         — replaces this script as PID 1 so
#                                    Render's SIGTERM reaches uvicorn
#                                    directly for a clean shutdown, not a
#                                    wrapper shell.
set -eu

# Wall-clock cap on step 2 only — overridable for local tuning, never meant
# to be raised to "wait it out" on Render: the goal is bounding uvicorn's
# start time, not maximizing catalog completeness on any one boot (KI-044's
# retry-on-next-boot behavior handles that). 90s gives a healthy run (~30s
# observed: 10 symbols x 3 calls x ~0.5-1s under normal Yahoo latency) a
# comfortable margin without risking Render's own multi-minute deploy
# timeout.
CATALOG_INGESTION_TIMEOUT_SECONDS="${CATALOG_INGESTION_TIMEOUT_SECONDS:-90}"

echo "[start.sh] Applying database migrations (alembic upgrade head)..."
alembic upgrade head
echo "[start.sh] Migrations complete."

if python -m app.ingestion.catalog_status; then
    echo "[start.sh] Asset catalog already present — skipping ingestion."
else
    echo "[start.sh] Asset catalog is empty — ingesting starter catalog (python -m app.ingestion.seed_real_catalog, capped at ${CATALOG_INGESTION_TIMEOUT_SECONDS}s)..."
    if timeout "${CATALOG_INGESTION_TIMEOUT_SECONDS}" python -m app.ingestion.seed_real_catalog; then
        echo "[start.sh] Starter catalog ingestion complete."
    else
        ingestion_status=$?
        if [ "$ingestion_status" -eq 124 ]; then
            echo "[start.sh] WARNING: starter catalog ingestion timed out after ${CATALOG_INGESTION_TIMEOUT_SECONDS}s (see output above)." >&2
        else
            echo "[start.sh] WARNING: starter catalog ingestion failed (exit ${ingestion_status}, see output above)." >&2
        fi
        echo "[start.sh] Starting the API anyway — the assets table is still empty, so this will retry automatically on the next boot/redeploy." >&2
    fi
fi

echo "[start.sh] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_CONCURRENCY:-1}"
