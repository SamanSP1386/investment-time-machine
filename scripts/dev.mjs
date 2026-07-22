#!/usr/bin/env node
/**
 * The project's single "start everything" command (`npm run dev`, run from
 * the repo root). Replaces the previous multi-terminal manual sequence
 * (`docker compose up -d`, then `alembic upgrade head` inside the backend
 * container, then a separate `npm run dev` inside `frontend/`) with one
 * command, documented in the README's run instructions.
 *
 * Plain Node (`child_process`, already a prerequisite for the frontend) —
 * no new dependency, cross-platform (Windows/macOS/Linux) without relying
 * on `make`, which is not installed by default on Windows.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const isWindows = process.platform === 'win32';

function run(command, args, options = {}) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: isWindows,
    cwd: repoRoot,
    ...options,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function fail(message) {
  console.error(`\n✗ ${message}`);
  process.exit(1);
}

// The backend container's own entrypoint (backend/scripts/start.sh,
// ADR-048) now applies migrations and — on a fresh database only — ingests
// the starter catalog automatically before uvicorn ever starts serving. A
// separate `docker compose exec ... alembic upgrade head` here would be
// redundant with that, and could race it against the same database, so
// readiness is checked the direct way instead: poll /healthz until the API
// actually answers. A generous budget (up to 3 minutes) accounts for a
// first-ever boot's real-catalog ingestion, which can take a while.
async function waitForBackendHealthy(url, { maxAttempts = 90, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // Connection refused/reset — expected while the container is still
      // migrating/ingesting and hasn't bound its port yet.
    }
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

const FRONTEND_PORT = 3000;

// Finds the PID of whatever process is LISTENING on `port`, or null if the
// port is free. No shell/pipe usage (the earlier `netstat -ano | findstr`
// idea was dropped — Node's `shell: true` re-quotes each arg individually
// before handing them to cmd.exe, which mangles a literal `|`); instead the
// full `netstat` output is captured and filtered in JS.
function findPidOnPort(port) {
  if (isWindows) {
    const result = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
    if (!result.stdout) return null;
    const line = result.stdout
      .split(/\r?\n/)
      .find((l) => l.includes('LISTENING') && l.includes(`:${port} `));
    if (!line) return null;
    const pid = line.trim().split(/\s+/).pop();
    return /^\d+$/.test(pid) ? pid : null;
  }
  const result = spawnSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
  const pid = result.stdout ? result.stdout.trim().split('\n')[0] : null;
  return pid || null;
}

// Only a confirmed Node process is auto-killed (see ensurePortIsFree below)
// — killing an arbitrary unrelated process automatically, just because it
// happens to occupy port 3000, is too risky to do silently.
function isLikelyNodeProcess(pid) {
  if (isWindows) {
    const result = spawnSync('tasklist', ['/FI', `PID eq ${pid}`, '/NH'], { encoding: 'utf8' });
    return typeof result.stdout === 'string' && /node\.exe/i.test(result.stdout);
  }
  const result = spawnSync('ps', ['-p', pid, '-o', 'comm='], { encoding: 'utf8' });
  return typeof result.stdout === 'string' && /node/i.test(result.stdout);
}

function killPid(pid) {
  if (isWindows) {
    spawnSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' });
  } else {
    spawnSync('kill', ['-9', pid], { stdio: 'ignore' });
  }
}

// Guards against silent port drift: without this check, if something is
// already bound to port 3000, Next.js just starts on 3001 (then 3002, ...)
// instead of failing — and that drifted port then no longer matches
// CORS_ALLOWED_ORIGINS (app/core/config.py, now comma-list-aware precisely
// to make room for this), so API calls start failing with a CORS error that
// looks completely unrelated to "a stray dev server is still running."
function ensurePortIsFree(port) {
  const pid = findPidOnPort(port);
  if (!pid) return;

  console.log(`\nPort ${port} is already in use (pid ${pid}).`);
  if (isLikelyNodeProcess(pid)) {
    console.log(
      `That looks like a leftover Node process (a previous dev server) — killing pid ${pid} ` +
        `so the frontend starts on its expected port ${port} instead of silently drifting to ` +
        `the next free one...`
    );
    killPid(pid);
    return;
  }

  fail(
    `Port ${port} is already in use by a non-Node process (pid ${pid}). This script only ` +
      `auto-frees a port it can confirm is a leftover Node process — killing an unrelated ` +
      `process automatically is too risky to do silently. Stop it yourself, then re-run ` +
      `\`npm run dev\`.`
  );
}

console.log('Investment Time Machine — starting the full local stack\n');

// 1. Postgres, Redis, and the backend API (docker-compose.yml). `depends_on`
// with `condition: service_healthy` already makes this call block until
// Postgres/Redis pass their own healthchecks before the backend starts.
if (run('docker', ['compose', 'up', '-d', '--build']) !== 0) {
  fail('docker compose up failed — is Docker Desktop running?');
}

// 2. Wait for the backend to finish booting. See waitForBackendHealthy's
// own comment above for why this replaced a separate migration step.
console.log('\nWaiting for the backend to become healthy (migrations, and first-run catalog ingestion if this is a fresh database)...');
const healthy = await waitForBackendHealthy('http://localhost:8000/healthz');
if (!healthy) {
  fail('Backend did not become healthy after repeated retries — check `docker compose logs backend`.');
}
console.log('Backend is healthy.');

// 3. Frontend dependencies, installed on first run only.
const frontendDir = path.join(repoRoot, 'frontend');
if (!existsSync(path.join(frontendDir, 'node_modules'))) {
  console.log('\nfrontend/node_modules not found — running npm install...');
  if (run('npm', ['install'], { cwd: frontendDir }) !== 0) {
    fail('npm install (frontend) failed.');
  }
}

// 4. Frontend dev server — the one long-running foreground process. Postgres/
// Redis/the backend keep running in the background (`docker compose up -d`);
// stop them separately with `docker compose down` when done.
ensurePortIsFree(FRONTEND_PORT);
console.log(`\nStarting frontend dev server (http://localhost:${FRONTEND_PORT})...\n`);
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: isWindows,
});
frontend.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => frontend.kill('SIGINT'));
process.on('SIGTERM', () => frontend.kill('SIGTERM'));
