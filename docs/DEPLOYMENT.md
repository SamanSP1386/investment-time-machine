# DEPLOYMENT.md

Founder runbook for the first public deploy: **frontend on Vercel, backend + Postgres on Render (free tier), Redis omitted.** Written for someone who has never done this before — follow the steps in order.

This is a **free-tier, no-custom-domain** deploy. Read [Free-tier caveats](#free-tier-caveats-read-this-first) and [Known limitation: cross-site login](#known-limitation-cross-site-login-doesnt-work-ki-039) before you start, so nothing below surprises you.

---

## Free-tier caveats — read this first

- **Cold starts.** Render's free web services spin down after a period of inactivity and take roughly **30-60 seconds** to wake back up on the next request. The first visitor after a quiet period will see a slow initial load (or a request that times out and needs a retry) — this is normal, not a bug. [Optional: keep it warm with UptimeRobot](#optional-keep-the-backend-warm-with-uptimerobot) below.
- **Free Postgres has a lifespan.** Render's free-tier PostgreSQL databases are not permanent — Render has historically enforced an expiration window (on the order of 30-90 days) after which a free database is deleted unless upgraded to a paid plan. **Check the current policy in the Render dashboard when you create the database** (it's stated on the database's own page) and calendar a reminder before that date — losing the database means losing every simulation ever created plus the ingested catalog, and required rerunning the one-shot ingestion step below.
- **Single instance, no Redis.** Rate limiting and account lockout run in-process on this deploy (see [Redis-optional](#why-theres-no-redis) below) — correct and safe for a single free-tier instance, but counters reset on every redeploy/restart and aren't shared if you ever scale to multiple instances.
- **No auto-deploy wired up yet.** This pass deliberately does not connect a git push/merge to an automatic Render or Vercel deploy — every deploy is a manual action you trigger, until that's set up separately.

## Known limitation: cross-site login doesn't work (KI-039)

The backend's session cookies use `SameSite=Strict`, which only attaches on requests where the frontend and backend share the same **registrable domain**. `your-app.vercel.app` and `your-api.onrender.com` are two different registrable domains — no custom domain is configured for this deploy — so **any login/register/refresh flow will silently fail to authenticate cross-site.**

This is expected and does not block anything: the product's core flow — running a simulation anonymously and sharing/viewing the result — needs no cookie at all and is fully functional. `NEXT_PUBLIC_AUTH_ENABLED` (`frontend/.env.example`, default `false`) exists so a future login UI stays hidden on this deployment rather than shipping a "sign in" button that cannot work — no login UI is built yet, so there is nothing to hide today, but a future one should check this flag. If a custom domain is ever configured with the frontend and backend as sibling subdomains (`app.example.com` / `api.example.com`), see `docs/KNOWN_ISSUES.md` KI-039 for the resolution path.

---

## Part 1 — Backend + Database on Render

### Step 1 — Create the Render Blueprint

1. Push this repository to GitHub if it isn't already (a Render Blueprint deploys from a GitHub/GitLab repo — Render needs read access to it).
2. In the [Render dashboard](https://dashboard.render.com), click **New +** → **Blueprint**.
3. Connect the repository. Render will detect `render.yaml` at the repo root and propose:
   - A **Postgres database** — `itm-postgres`, free plan.
   - A **web service** — `itm-backend`, built from `backend/Dockerfile`, free plan.
4. Click **Apply**. Render creates both resources. The web service's first deploy will likely **fail or crash-loop at this point** — that's expected, because two required env vars (below) aren't set yet.

### Step 2 — Set the remaining environment variables

`render.yaml` pre-fills most values (including auto-generating a real `JWT_SECRET` and wiring `DATABASE_URL` straight from the Postgres instance it created). Two values are deliberately left blank (`sync: false` in `render.yaml`) because they can't be known until later steps — go to the `itm-backend` service's **Environment** tab in the Render dashboard and set:

| Key | Value | When to set it |
|---|---|---|
| `CORS_ALLOWED_ORIGINS` | Your Vercel URL, e.g. `https://investment-time-machine.vercel.app` | After Part 2 creates the Vercel project — come back and set this then. Until it's set, `app.core.config.Settings` refuses to boot (production fail-fast guard) if it's left at the `http://localhost:3000` default — so the very first deploy attempt failing is expected, not a bug. |
| `FRED_API_KEY` | Optional — leave blank unless you want Economic Indicator ingestion | Never required for the core deploy; the starter asset catalog (Step 4) doesn't use it. |

Every other required var (`DATABASE_URL`, `JWT_SECRET`, `ENVIRONMENT=production`, `COOKIE_SECURE=true`) is already set by `render.yaml`. `REDIS_URL` is deliberately **not set at all** — see [Why there's no Redis](#why-theres-no-redis).

For now, set `CORS_ALLOWED_ORIGINS` to a placeholder (e.g. `https://placeholder.vercel.app`) so the service boots — you'll come back and set the real value in Part 2, Step 3.

### Step 3 — Deploy and confirm it's healthy

1. Trigger (or wait for) a deploy from the **Manual Deploy** button on the `itm-backend` service page.
2. Watch the deploy log. Once live, open the service's public URL (shown at the top of its dashboard page, something like `https://itm-backend.onrender.com`) and hit:
   ```
   https://itm-backend.onrender.com/healthz
   ```
   Expect `{"success":true,"data":{"status":"healthy"}}`. If this fails, check the deploy log first — a fail-fast `Settings` validation error (missing/placeholder env var) shows up there immediately, in plain English, naming exactly which variable is wrong.

### Step 4 — Run the one-shot migration + catalog ingestion

**Why a manual one-shot instead of an automatic release command:** Render's free tier's support for a pre-deploy/release-command step has changed across product versions and isn't something this session could verify against a live account (no network access here). A manual command run once via Render's **Shell** tab is guaranteed to work on every plan tier, gives you direct visibility into exactly what ran and what it printed, and — since the production database starts completely empty — needs to happen exactly once per environment anyway, which a manual step handles just as well as an automated one. If your Render plan does support a pre-deploy command and you'd prefer to wire `alembic upgrade head` into it for future deploys, that's a safe, optional follow-up — the command itself is identical either way.

1. On the `itm-backend` service page, open the **Shell** tab (a browser-based terminal into the running instance).
2. Apply migrations:
   ```bash
   alembic upgrade head
   ```
   This creates all ten tables (nine Founder Specification domains). Safe to re-run — Alembic no-ops if already at `head`.
3. Ingest the starter asset catalog (the production database starts empty — nothing is queryable until this runs):
   ```bash
   python -m app.ingestion.seed_real_catalog
   ```
   This ingests real daily price history (plus dividends/splits where available) for ten well-known symbols — AAPL, MSFT, TSLA, NVDA, GOOGL, AMZN, SPY, QQQ, BTC-USD, ETH-USD — via `YahooChartProvider` (`docs/KNOWN_ISSUES.md` KI-044/ADR-046). It's idempotent: safe to re-run later (e.g. to pick up new trading days) without duplicating rows.
   - This step makes real, live HTTP requests to Yahoo's public chart endpoint from Render's network. If it fails with a rate-limit-shaped error, wait a few minutes and re-run — see KI-044 for the full failure mode this provider is built to tolerate.

### Step 5 — Re-verify `/healthz` and a real API call

```
curl https://itm-backend.onrender.com/healthz
curl https://itm-backend.onrender.com/api/v1/assets?query=NVDA
```
The second call should return NVDA in its results now that Step 4 has run.

---

## Part 2 — Frontend on Vercel

### Step 1 — Create the Vercel project

1. In the [Vercel dashboard](https://vercel.com/new), import the same GitHub repository.
2. Vercel will ask for the project's **Root Directory** — set it to `frontend`. This repo is not a single-app repo, so this step is required; Vercel then auto-detects Next.js and needs no further build configuration. (`frontend/vercel.json` pins the framework/build/install commands explicitly for reproducibility — see that file — but Root Directory must still be set in the dashboard; `vercel.json` alone does not replace it in a monorepo layout.)

### Step 2 — Set environment variables

In the new project's **Settings → Environment Variables**, add (for the **Production** environment, and Preview too if you want preview deploys to work identically):

| Key | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | `https://itm-backend.onrender.com` | The Render backend URL from Part 1, Step 3. No trailing slash. |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-project-name>.vercel.app` | Used for absolute Open Graph/Twitter card URLs (`frontend/src/app/layout.tsx`). You may not know the exact final Vercel URL until after the first deploy — see the note below. |
| `NEXT_PUBLIC_AUTH_ENABLED` | `false` | Leave as the default — see [Known limitation](#known-limitation-cross-site-login-doesnt-work-ki-039) above. |

**About `NEXT_PUBLIC_SITE_URL` and the chicken-and-egg URL problem:** Vercel assigns your project's `.vercel.app` URL as soon as the project is created (visible immediately in the dashboard, before the first deploy even finishes) — so you can set this correctly up front. If you ever change the project name (which changes the URL), update this var and redeploy.

### Step 3 — Deploy, then close the loop with the backend's CORS setting

1. Trigger the deploy (Vercel deploys automatically once the project is created and connected; use **Deployments → Redeploy** to force one after changing env vars).
2. Once live, copy the real production URL from the Vercel dashboard.
3. **Go back to Render** (`itm-backend` → Environment) and set `CORS_ALLOWED_ORIGINS` to that exact URL (Part 1, Step 2's placeholder). Save — Render redeploys the backend automatically on an env var change.
   - If you also want Vercel *preview* deployments (a different URL per branch/PR) to be able to call the API, list them too, comma-separated: `CORS_ALLOWED_ORIGINS=https://investment-time-machine.vercel.app,https://investment-time-machine-git-preview.vercel.app` (`app.core.config.Settings.cors_allowed_origins_list` splits on commas).

### Optional: keep the backend warm with UptimeRobot

To reduce how often visitors hit the ~30-60s cold-start delay, set up a free [UptimeRobot](https://uptimerobot.com) HTTP monitor pinging `https://itm-backend.onrender.com/healthz` every 5 minutes. This is a convenience, not a fix — Render's free tier still enforces its own spin-down policy, and this is disclosed as a mitigation, not a guarantee.

---

## Post-deploy verification checklist

Run through all of these against the real public URLs before calling the deploy done:

- [ ] `https://itm-backend.onrender.com/healthz` returns `200` with `{"success":true,"data":{"status":"healthy"}}`.
- [ ] Asset search returns NVDA: `https://itm-backend.onrender.com/api/v1/assets?query=NVDA` includes it in the results.
- [ ] All three landing-page example simulations (`frontend/src/config/example-simulations.ts`) run end-to-end on the public Vercel URL — click each one, confirm a real Results page renders with real numbers, not an error state.
- [ ] View source (or the browser's dev tools → Elements → `<head>`) on the public landing page and confirm `og:image`/`og:url`/`twitter:image` point at the real `https://<your-project>.vercel.app` domain, not `localhost`.
- [ ] Open a completed simulation's permalink (`/simulation/{id}`) in an **incognito/private window** (no cookies, no prior session) and confirm it renders correctly — this is the real-world test of "anonymous simulations are fully shareable," since incognito guarantees no leftover local state is propping up the result.
- [ ] Confirm login/register is either absent from the UI or, if present, behaves as documented in [Known limitation](#known-limitation-cross-site-login-doesnt-work-ki-039) above (no login UI exists as of this deploy, so this should trivially pass).

---

## Why there's no Redis

Redis was deliberately excluded from this deploy (no Render Redis add-on, no `REDIS_URL` set) rather than added just to keep parity with local dev. `app.core.rate_limit` and `app.auth.lockout` both detect an unset `REDIS_URL` and fall back automatically to an in-process equivalent (`InMemoryRateLimiter` / `InMemoryAccountLockout`) — logged clearly at application startup (`app/main.py`) so this is never a silent surprise in the Render logs. Full design rationale: `docs/ARCHITECTURE_DECISIONS.md` ADR-047.

This is a correct, safe choice for a **single-instance, free-tier** deployment: rate limiting and login lockout still work, just per-instance rather than shared, and reset on redeploy/restart rather than persisting indefinitely. It would need revisiting (add a real Redis instance and set `REDIS_URL`) before ever running multiple backend instances behind a load balancer, where per-instance counters would under-enforce the configured limits.

---

## Local development is unaffected

Everything above is about the **deployed** environment. `docker compose up` / `npm run dev` (root) still start Postgres **and Redis** locally exactly as before (`docker-compose.yml` is unchanged) — local dev keeps exercising the Redis-backed code path, not the fallback, so both paths stay covered by the local dev loop plus the test suite (`backend/tests/core/test_rate_limit.py`, `backend/tests/auth/test_lockout.py` — Redis-backed cases skip gracefully if Redis isn't reachable, matching this project's existing DB-integration test convention; in-process cases have no such dependency and always run).
