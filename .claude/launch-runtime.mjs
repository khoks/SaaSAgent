/**
 * Launch wrapper that injects ANTHROPIC_API_KEY into the runtime's env.
 *
 * Used by .claude/launch.json so the Claude_Preview MCP (which inherits its
 * environment from Claude Code's process, which doesn't have machine-level env
 * vars set after launch) can still start the runtime with HaikuComposer enabled.
 *
 * Reads the key from Windows machine-scope env via PowerShell. macOS/Linux fall
 * through with a warning — set ANTHROPIC_API_KEY in your shell before launching
 * Claude Code on those platforms.
 */
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

if (!process.env.ANTHROPIC_API_KEY) {
  if (process.platform === 'win32') {
    try {
      const key = execSync(
        `powershell.exe -NoProfile -Command "[Environment]::GetEnvironmentVariable('ANTHROPIC_API_KEY', 'Machine')"`,
        { encoding: 'utf8' },
      ).trim();
      if (key) {
        process.env.ANTHROPIC_API_KEY = key;
        // eslint-disable-next-line no-console
        console.log('[launch-runtime] loaded ANTHROPIC_API_KEY from Windows machine env');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[launch-runtime] could not read machine env:', err.message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[launch-runtime] ANTHROPIC_API_KEY not in env — runtime will use StubComposer');
  }
}

// Explicitly construct + start. We can't rely on dist/index.js's auto-start
// (its `if (isMain)` check compares process.argv[1] to its own file URL — false
// when invoked through this wrapper).
const { Runtime } = await import(
  pathToFileURL(resolve(repoRoot, 'packages/runtime/dist/index.js')).href
);
const port = process.env.SAAS_AGENT_PORT ? Number(process.env.SAAS_AGENT_PORT) : 8080;
const runtime = new Runtime({ port });
await runtime.start();
const shutdown = async (sig) => {
  // eslint-disable-next-line no-console
  console.log(`\n[launch-runtime] caught ${sig}, shutting down…`);
  await runtime.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
