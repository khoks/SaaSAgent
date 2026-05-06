/**
 * Child runtime launcher — Phase 2.4.x federation demo.
 *
 * Spawns a SECOND runtime instance on port 8081 so the parent (port 8080) can
 * delegate to it as a registered sub-agent (descriptor.endpoint =
 * http://localhost:8081/federate). Symmetric federation: this child has the
 * same code as the parent but is configured separately at runtime.
 *
 * Same env-loading flow as launch-runtime.mjs — ANTHROPIC_API_KEY from
 * Windows machine scope so the child runs SonnetPlanner against its own
 * (separate) registries.
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
        console.log('[launch-runtime-child] loaded ANTHROPIC_API_KEY from Windows machine env');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[launch-runtime-child] could not read machine env:', err.message);
    }
  } else {
    // eslint-disable-next-line no-console
    console.warn('[launch-runtime-child] ANTHROPIC_API_KEY not in env — child will use StubPlanner');
  }
}

const { Runtime } = await import(
  pathToFileURL(resolve(repoRoot, 'packages/runtime/dist/index.js')).href
);
const runtime = new Runtime({ port: 8081 });
await runtime.start();
// eslint-disable-next-line no-console
console.log('[launch-runtime-child] child runtime listening on http://localhost:8081');
const shutdown = async (sig) => {
  // eslint-disable-next-line no-console
  console.log(`\n[launch-runtime-child] caught ${sig}, shutting down…`);
  await runtime.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
