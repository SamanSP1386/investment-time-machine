FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .
COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh

EXPOSE 8000

# backend/scripts/start.sh runs migrations, ingests the starter catalog
# exactly once (a real "is the assets table empty?" DB check, not an env
# flag — Render's free tier has no Shell/One-Off Jobs access to do this as a
# separate manual step, docs/DEPLOYMENT.md), then `exec`s into uvicorn
# itself, binding ${PORT}/${WEB_CONCURRENCY} (Render injects PORT at
# runtime; docker-compose's local mapping never sets it, so the script's own
# ${PORT:-8000} fallback keeps that working identically). Exec form (not
# shell form): start.sh becomes PID 1 directly, and its own `exec uvicorn`
# then replaces PID 1 again — no wrapper shell sits between Render's SIGTERM
# and uvicorn. WEB_CONCURRENCY defaults to 1 inside start.sh: the Render
# free-tier instance has 512MB RAM, and this is a synchronous-DB-session
# FastAPI app (no async worker model to exploit), so a single uvicorn worker
# is the safe default — raise it via an env var on a paid plan with more
# memory, never by editing this file.
CMD ["/app/scripts/start.sh"]
