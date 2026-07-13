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

console.log('Investment Time Machine — starting the full local stack\n');

// 1. Postgres, Redis, and the backend API (docker-compose.yml). `depends_on`
// with `condition: service_healthy` already makes this call block until
// Postgres/Redis pass their own healthchecks before the backend starts.
if (run('docker', ['compose', 'up', '-d', '--build']) !== 0) {
  fail('docker compose up failed — is Docker Desktop running?');
}

// 2. Apply migrations inside the backend container. The backend container
// itself has no healthcheck (only Postgres/Redis do), so its Python
// environment may need a moment after `docker compose up` returns — retried
// briefly rather than assumed ready on the first attempt.
console.log('\nApplying database migrations (alembic upgrade head)...');
const MAX_ATTEMPTS = 10;
let migrated = false;
for (let attempt = 1; attempt <= MAX_ATTEMPTS && !migrated; attempt += 1) {
  const status = run('docker', ['compose', 'exec', '-T', 'backend', 'alembic', 'upgrade', 'head']);
  if (status === 0) {
    migrated = true;
  } else if (attempt < MAX_ATTEMPTS) {
    console.log(`Backend not ready yet (attempt ${attempt}/${MAX_ATTEMPTS}) — retrying in 2s...`);
    spawnSync(isWindows ? 'timeout' : 'sleep', [isWindows ? '/t' : '2', ...(isWindows ? ['/nobreak'] : [])], {
      stdio: 'ignore',
      shell: isWindows,
    });
  }
}
if (!migrated) {
  fail('alembic upgrade head did not succeed after repeated retries — check `docker compose logs backend`.');
}

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
console.log('\nStarting frontend dev server (http://localhost:3000)...\n');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: isWindows,
});
frontend.on('exit', (code) => process.exit(code ?? 0));
process.on('SIGINT', () => frontend.kill('SIGINT'));
process.on('SIGTERM', () => frontend.kill('SIGTERM'));
