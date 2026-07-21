FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY alembic ./alembic
COPY alembic.ini .

EXPOSE 8000

# Shell form (not exec form) so ${PORT}/${WEB_CONCURRENCY} are actually
# expanded — Render injects PORT at runtime and the container must bind to
# it, not the fixed 8000 local docker-compose happens to map (docs/DEPLOYMENT.md).
# WEB_CONCURRENCY defaults to 1: the Render free-tier instance has 512MB RAM,
# and this is a synchronous-DB-session FastAPI app (no async worker model to
# exploit), so a single uvicorn worker is the safe default — raise it via an
# env var on a paid plan with more memory, never by editing this file.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${WEB_CONCURRENCY:-1}
