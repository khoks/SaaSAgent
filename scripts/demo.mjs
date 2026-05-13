#!/usr/bin/env node
/**
 * SaaSAgent demo launcher.
 *
 * Boots the full Expedia reference integration in one command:
 *   • runtime     :8080  (agent server with skills + sub-agent registry)
 *   • trip-planner :8082  (federated sub-agent)
 *   • host        :5175  (mock expedia.com page with embedded shell)
 *
 * Polls each service's health endpoint until ready, opens Chrome to the
 * host URL, and prefixes each child's stdout/stderr with a colored tag
 * so you can see what came from where.
 *
 * Ctrl-C (SIGINT) gracefully tears all three down — including child
 * processes spawned by pnpm/vite on Windows (which doesn't propagate
 * signals by default, so we use taskkill /T /F).
 *
 * Usage:
 *   node scripts/demo.mjs
 *   # or, after this lands in package.json:
 *   pnpm demo
 *
 * Flags:
 *   --no-open        Skip launching Chrome (you'll just see URLs printed).
 *   --no-build       Skip the up-front build (assumes packages are built).
 *   --port-runtime N Override runtime port (default 8080).
 *   --port-subagent N (default 8082).
 *   --port-host N    (default 5175).
 *
 * Requires Node 20+.
 */

import { spawn, exec } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import { request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

// ---------- CLI args ----------
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const argVal = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const OPEN_BROWSER = !flag('--no-open');
const DO_BUILD = !flag('--no-build');
const PORT_RUNTIME = Number(argVal('--port-runtime', 8080));
const PORT_SUBAGENT = Number(argVal('--port-subagent', 8082));
const PORT_HOST = Number(argVal('--port-host', 5175));

// ---------- ANSI colors (tag-prefixed log lines) ----------
const isTTY = process.stdout.isTTY;
const color = (code, s) => (isTTY ? `\x1b[${code}m${s}\x1b[0m` : s);
const RED = (s) => color(31, s);
const GREEN = (s) => color(32, s);
const YELLOW = (s) => color(33, s);
const BLUE = (s) => color(34, s);
const MAGENTA = (s) => color(35, s);
const CYAN = (s) => color(36, s);
const DIM = (s) => color(2, s);
const BOLD = (s) => color(1, s);

// ---------- Port + URL helpers ----------
const URL_RUNTIME = `http://localhost:${PORT_RUNTIME}`;
const URL_SUBAGENT = `http://localhost:${PORT_SUBAGENT}`;
const URL_HOST = `http://localhost:${PORT_HOST}`;
const URL_DASHBOARD = `${URL_RUNTIME}/dashboard`;

async function checkPortFree(port) {
  // Probe by trying a tiny HTTP GET to /. If anything responds, port is busy.
  return new Promise((resolve) => {
    const req = httpRequest(
      { host: '127.0.0.1', port, method: 'HEAD', path: '/', timeout: 500 },
      (res) => {
        res.destroy();
        resolve(false); // got a response → in use
      },
    );
    req.on('error', () => resolve(true)); // connection refused → free
    req.on('timeout', () => {
      req.destroy();
      resolve(false); // timeout → something's there but not responsive
    });
    req.end();
  });
}

async function waitForHealthy(url, opts = {}) {
  const { timeoutMs = 30000, intervalMs = 500, label = url } = opts;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ok = await new Promise((resolve) => {
        const req = httpRequest(`${url}`, { method: 'GET', timeout: 1500 }, (res) => {
          res.destroy();
          resolve(res.statusCode != null && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });
        req.end();
      });
      if (ok) return true;
    } catch {
      /* swallow */
    }
    await wait(intervalMs);
  }
  throw new Error(`Timed out waiting for ${label} (${url})`);
}

// ---------- Child process management ----------
/** @type {Array<{name: string, child: import('node:child_process').ChildProcess, color: (s: string) => string}>} */
const children = [];
let shuttingDown = false;

function spawnChild({ name, command, args: cmdArgs, cwd, env, colorFn }) {
  // shell: true is only needed on Windows for `.cmd`/`.bat` shims (e.g. pnpm.cmd).
  // For direct binaries like `node`, avoid shell:true — it triggers DEP0190
  // (Node 22+) and isn't necessary. When we DO need shell:true, concat args
  // into a single command string (which DEP0190 considers safe) — our args
  // come from this script only, so injection is not a concern.
  const needsShell = process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');
  const spawnArgs = needsShell ? [`${command} ${cmdArgs.join(' ')}`, []] : [command, cmdArgs];
  const child = spawn(spawnArgs[0], spawnArgs[1], {
    cwd,
    env: { ...process.env, ...env },
    shell: needsShell,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const prefix = colorFn(`[${name}]`);
  const writeLines = (buf) => {
    buf
      .toString('utf8')
      .split(/\r?\n/)
      .filter((l) => l.length > 0)
      .forEach((line) => process.stdout.write(`${prefix} ${line}\n`));
  };
  child.stdout.on('data', writeLines);
  child.stderr.on('data', writeLines);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (code !== 0 && code !== null) {
      process.stdout.write(
        `${prefix} ${RED(`exited with code ${code} (signal=${signal}); shutting down the rest`)}\n`,
      );
      void shutdown(1);
    }
  });
  children.push({ name, child, color: colorFn });
  return child;
}

async function killChild(rec) {
  return new Promise((resolve) => {
    if (!rec.child || rec.child.killed) return resolve();
    if (process.platform === 'win32') {
      // taskkill walks the process tree so vite + its esbuild + pnpm-spawn all die.
      exec(`taskkill /pid ${rec.child.pid} /t /f`, () => resolve());
    } else {
      rec.child.kill('SIGTERM');
      setTimeout(() => {
        if (!rec.child.killed) rec.child.kill('SIGKILL');
        resolve();
      }, 2000);
    }
  });
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${BOLD(YELLOW('▼ shutting down…'))}`);
  // Kill in reverse-startup order: host first (most likely to hang), then sub-agent, then runtime.
  for (const rec of [...children].reverse()) {
    process.stdout.write(`${rec.color(`[${rec.name}]`)} ${DIM('stopping')}\n`);
    await killChild(rec);
  }
  console.log(BOLD(GREEN('✓ all services stopped')));
  process.exit(exitCode);
}

// ---------- Browser open ----------
function openInChrome(url) {
  const p = process.platform;
  // Best-effort: prefer Chrome explicitly, fall back to default browser.
  // Each shell command exits immediately; we don't track this child.
  if (p === 'win32') {
    exec(`start "" chrome "${url}"`, (err) => {
      if (err) exec(`start "" "${url}"`); // fallback to default
    });
  } else if (p === 'darwin') {
    exec(`open -a "Google Chrome" "${url}"`, (err) => {
      if (err) exec(`open "${url}"`);
    });
  } else {
    exec(`google-chrome "${url}"`, (err) => {
      if (err) exec(`xdg-open "${url}"`);
    });
  }
}

// ---------- Main ----------
async function main() {
  console.log(BOLD(CYAN('SaaSAgent demo launcher')));
  console.log(DIM(`  cwd: ${REPO_ROOT}`));
  console.log(
    DIM(
      `  ports: runtime=${PORT_RUNTIME}  subagent=${PORT_SUBAGENT}  host=${PORT_HOST}`,
    ),
  );
  console.log();

  // 1. Pre-flight port checks.
  console.log(BOLD('▸ pre-flight'));
  for (const [port, label] of [
    [PORT_RUNTIME, 'runtime'],
    [PORT_SUBAGENT, 'sub-agent'],
    [PORT_HOST, 'host'],
  ]) {
    const free = await checkPortFree(port);
    if (!free) {
      console.error(
        RED(
          `  ✗ port ${port} (${label}) is already in use. Free it first (Windows: taskkill /pid <pid> /t /f) or pass --port-${label === 'sub-agent' ? 'subagent' : label} to override.`,
        ),
      );
      process.exit(2);
    }
    console.log(GREEN(`  ✓ port ${port} (${label}) is free`));
  }
  console.log();

  // 2. Build (unless --no-build).
  if (DO_BUILD) {
    console.log(BOLD('▸ building required packages (pass --no-build to skip)'));
    await new Promise((resolve, reject) => {
      const pnpmCmd = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
      const buildArgs = [
        '--filter',
        '@saasagent/protocol',
        '--filter',
        '@saasagent/runtime',
        '--filter',
        '@saasagent/web-shell',
        '--filter',
        '@saasagent/sdk',
        'build',
      ];
      // Windows: concat into a single shell string to silence DEP0190; elsewhere
      // exec directly.
      const winBuild = process.platform === 'win32';
      const b = spawn(
        winBuild ? `${pnpmCmd} ${buildArgs.join(' ')}` : pnpmCmd,
        winBuild ? [] : buildArgs,
        {
          cwd: REPO_ROOT,
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: winBuild,
        },
      );
      const tag = DIM('[build]');
      b.stdout.on('data', (buf) =>
        buf
          .toString()
          .split(/\r?\n/)
          .filter((l) => l)
          .forEach((l) => process.stdout.write(`${tag} ${l}\n`)),
      );
      b.stderr.on('data', (buf) =>
        buf
          .toString()
          .split(/\r?\n/)
          .filter((l) => l)
          .forEach((l) => process.stdout.write(`${tag} ${l}\n`)),
      );
      b.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build exited ${code}`))));
    });
    console.log(GREEN('  ✓ build complete'));
    console.log();
  }

  // 3. Start the three services.
  console.log(BOLD('▸ starting services'));

  spawnChild({
    name: 'runtime',
    command: 'node',
    args: ['apps/demo-expedia/server/start-runtime.mjs'],
    cwd: REPO_ROOT,
    env: { SAAS_AGENT_PORT: String(PORT_RUNTIME) },
    colorFn: BLUE,
  });

  spawnChild({
    name: 'sub-agent',
    command: 'node',
    args: ['apps/demo-expedia/server/start-trip-planner.mjs'],
    cwd: REPO_ROOT,
    env: {},
    colorFn: MAGENTA,
  });

  spawnChild({
    name: 'host',
    command: process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    args: ['--filter', '@saasagent/demo-expedia', 'dev'],
    cwd: REPO_ROOT,
    env: {},
    colorFn: CYAN,
  });

  // 4. Wait for each to be healthy.
  console.log();
  console.log(BOLD('▸ waiting for services to be ready'));
  try {
    await waitForHealthy(`${URL_RUNTIME}/health`, { label: 'runtime' });
    console.log(GREEN(`  ✓ runtime ready    ${URL_RUNTIME}/health`));
    await waitForHealthy(`${URL_SUBAGENT}/health`, { label: 'sub-agent' });
    console.log(GREEN(`  ✓ sub-agent ready  ${URL_SUBAGENT}/health`));
    await waitForHealthy(URL_HOST, { label: 'host' });
    console.log(GREEN(`  ✓ host ready       ${URL_HOST}`));
  } catch (err) {
    console.error(RED(`✗ ${err.message}`));
    await shutdown(3);
    return;
  }

  // 5. Print the playbook.
  console.log();
  console.log(BOLD(GREEN('▶ all systems go')));
  console.log();
  console.log(`  ${BOLD('Open in browser:')}  ${BOLD(URL_HOST)}`);
  console.log(`  ${DIM('Eval dashboard:')}   ${URL_DASHBOARD}`);
  console.log(`  ${DIM('Runtime health:')}   ${URL_RUNTIME}/health`);
  console.log();
  console.log(
    `  ${DIM('Try in the agent panel:')} type "show me 4K flights to NRT" — runs the planner${process.env.ANTHROPIC_API_KEY ? '' : ' (stub mode — see /health.devHint)'}`,
  );
  console.log(
    `  ${DIM('Or wait ~10s idle for the proactive nudge (Phase 5).')}`,
  );
  console.log(
    `  ${DIM('Or send 6 messages to exhaust the free tier (5/day) — see QuotaBanner cycle (Phase 7).')}`,
  );
  console.log();
  console.log(`  ${BOLD(YELLOW('Press Ctrl-C to stop everything.'))}`);
  console.log();

  // 6. Open Chrome.
  if (OPEN_BROWSER) {
    openInChrome(URL_HOST);
  }
}

// ---------- Signal handling ----------
process.on('SIGINT', () => {
  void shutdown(0);
});
process.on('SIGTERM', () => {
  void shutdown(0);
});
process.on('uncaughtException', (err) => {
  console.error(RED(`uncaught: ${err.stack ?? err.message ?? err}`));
  void shutdown(1);
});

main().catch(async (err) => {
  console.error(RED(`✗ ${err.stack ?? err.message ?? err}`));
  await shutdown(1);
});
