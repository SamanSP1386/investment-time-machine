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
#   3. uvicorn, via `exec`         — replaces this script as PID 1 so
#                                    Render's SIGTERM reaches uvicorn
#                                    directly for a clean shutdown, not a
#                                    wrapper shell.
set -eu

echo "[start.sh] Applying database migrations (alembic upgrade head)..."
alembic upgrade head
echo "[start.sh] Migrations complete."

if python -m app.ingestion.catalog_status; then
    echo "[start.sh] Asset catalog already present — skipping ingestion."
else
    echo "[start.sh] Asset catalog is empty — ingesting starter catalog (python -m app.ingestion.seed_real_catalog)..."
    if python -m app.ingestion.seed_real_catalog; then
        echo "[start.sh] Starter catalog ingestion complete."
    else
        echo "[start.sh] WARNING: starter catalog ingestion failed (see output above)." >&2
        echo "[start.sh] Starting the API anyway — the assets table is still empty, so this will retry automatically on the next boot/redeploy." >&2
    fi
fi

echo "[start.sh] Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --workers "${WEB_CONCURRENCY:-1}"
