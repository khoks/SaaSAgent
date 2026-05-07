#!/usr/bin/env node
/**
 * @saasagent/cli — `saasagent` command-line tool.
 *
 * Commands:
 *   saasagent init <type> [name]   Scaffold a project (sub-agent | host)
 *   saasagent registry <verb>      Manage registries on a running runtime
 *                                  (list | put-skills | put-tools | put-features | put-subagents)
 *   saasagent eval <verb>          Inspect eval signals + churn
 *                                  (list | churn | churn-session <id>)
 *   saasagent --version
 *   saasagent --help
 *
 * Configurable via env:
 *   SAASAGENT_RUNTIME_URL  (default http://localhost:8080)
 *   SAASAGENT_AUTH_TOKEN   (passed as Bearer when set)
 */

import { promises as fs } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const VERSION = '0.1.0';

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq !== -1) {
        flags[a.slice(2, eq)] = a.slice(eq + 1);
      } else if (i + 1 < argv.length && !argv[i + 1]!.startsWith('-')) {
        flags[a.slice(2)] = argv[++i]!;
      } else {
        flags[a.slice(2)] = true;
      }
    } else if (a.startsWith('-')) {
      flags[a.slice(1)] = true;
    } else {
      positional.push(a);
    }
  }
  return { command: positional[0] ?? 'help', positional: positional.slice(1), flags };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const { command, positional, flags } = parseArgs(argv);

  if ('version' in flags || 'v' in flags || command === 'version') {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if ('help' in flags || 'h' in flags || command === 'help' || command === '') {
    printHelp();
    return;
  }

  switch (command) {
    case 'init':
      await cmdInit(positional, flags);
      return;
    case 'registry':
      await cmdRegistry(positional, flags);
      return;
    case 'eval':
      await cmdEval(positional, flags);
      return;
    default:
      process.stderr.write(`unknown command: ${command}\n`);
      printHelp();
      process.exitCode = 1;
  }
}

function printHelp(): void {
  process.stdout.write(`saasagent v${VERSION}

Usage: saasagent <command> [options]

Commands:
  init <type> [name]      Scaffold a project. type ∈ {sub-agent, host}.
                          Examples:
                            saasagent init sub-agent travel-specialist
                            saasagent init host my-saas

  registry <verb>         Manage registries on a running runtime.
                          Verbs: list | put-skills <file> | put-tools <file>
                                 | put-features <file> | put-subagents <file>

  eval <verb>             Inspect eval signals + churn.
                          Verbs: list | churn | churn-session <id>

  --runtime <url>         Override runtime URL (env SAASAGENT_RUNTIME_URL,
                          default http://localhost:8080)
  --token <bearer>        Bearer token (env SAASAGENT_AUTH_TOKEN)

  --version, -v           Print version
  --help, -h              Print this help
`);
}

// ────────────────────────────────────────────────────────────────────────────
//  init
// ────────────────────────────────────────────────────────────────────────────

async function cmdInit(positional: string[], _flags: Record<string, string | true>): Promise<void> {
  const type = positional[0];
  const name = positional[1];
  if (!type || !name) {
    process.stderr.write('usage: saasagent init <sub-agent|host> <name>\n');
    process.exitCode = 1;
    return;
  }
  if (type !== 'sub-agent' && type !== 'host') {
    process.stderr.write(`unknown init type "${type}" — expected "sub-agent" or "host"\n`);
    process.exitCode = 1;
    return;
  }
  const dir = resolve(process.cwd(), name);
  // Bail if dir already exists with content.
  try {
    const entries = await fs.readdir(dir);
    if (entries.length > 0) {
      process.stderr.write(`refusing to scaffold into non-empty directory: ${dir}\n`);
      process.exitCode = 1;
      return;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  if (type === 'sub-agent') {
    await scaffoldSubAgent(dir, name);
  } else {
    await scaffoldHost(dir, name);
  }
  process.stdout.write(`✓ scaffolded ${type} "${name}" at ${dir}\n`);
  process.stdout.write(`  next steps:\n`);
  process.stdout.write(`    cd ${name}\n`);
  process.stdout.write(`    pnpm install\n`);
  process.stdout.write(`    pnpm dev\n`);
}

export async function scaffoldSubAgent(dir: string, name: string): Promise<void> {
  const files: Record<string, string> = {
    'package.json': JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          build: 'tsc -p tsconfig.json',
          dev: 'tsx src/index.ts',
        },
        dependencies: {
          '@saasagent/sdk-ts': '*',
          '@saasagent/runtime': '*',
        },
        devDependencies: {
          tsx: '^4.0.0',
          typescript: '^5.6.0',
          '@types/node': '^22.0.0',
        },
      },
      null,
      2,
    ),
    'tsconfig.json': JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: 'dist',
        },
        include: ['src/**/*'],
      },
      null,
      2,
    ),
    'src/index.ts': `import { defineSubAgent } from '@saasagent/sdk-ts';

const PORT = Number(process.env.PORT ?? 8081);
const PARENT_URL = process.env.PARENT_URL ?? 'http://localhost:8080';

const app = await defineSubAgent({
  name: '${name}',
  version: '0.1.0',
  description: 'TODO: describe what this sub-agent does',
  whenToUse: 'TODO: describe when the parent should delegate to it',
  skills: [
    {
      descriptor: {
        name: 'example-skill',
        version: '1.0.0',
        description: 'Example in-process skill',
        whenToUse: 'when the user wants the example',
        kind: 'in-process',
      },
      handler: async (input) => ({ echo: input, ranOn: '${name}' }),
    },
  ],
});

await app.start({ port: PORT });
console.log(\`[\${'${name}'}] listening on http://localhost:\${PORT}/federate\`);

if (process.env.AUTO_REGISTER === '1') {
  await app.registerWith({
    parentUrl: PARENT_URL,
    endpoint: \`http://localhost:\${PORT}/federate\`,
    parentAuthToken: process.env.PARENT_AUTH_TOKEN,
  });
  console.log(\`[\${'${name}'}] registered with parent at \${PARENT_URL}\`);
}
`,
    'README.md': `# ${name}

A SaaSAgent sub-agent scaffolded by \`saasagent init sub-agent\`.

## Run

\`\`\`bash
pnpm install
pnpm dev   # starts on PORT=8081 by default
\`\`\`

To auto-register with a parent runtime on startup:

\`\`\`bash
PARENT_URL=http://localhost:8080 AUTO_REGISTER=1 pnpm dev
\`\`\`
`,
    '.gitignore': `node_modules
dist
*.tsbuildinfo
.env
.env.local
`,
  };
  await writeAll(dir, files);
}

export async function scaffoldHost(dir: string, name: string): Promise<void> {
  const files: Record<string, string> = {
    'package.json': JSON.stringify(
      {
        name,
        version: '0.1.0',
        private: true,
        type: 'module',
        scripts: {
          build: 'echo "host build placeholder"',
          dev: 'echo "Open index.html via your dev server (e.g. vite)"',
        },
        devDependencies: {
          '@saasagent/web-shell': '*',
          vite: '^5.0.0',
        },
      },
      null,
      2,
    ),
    'index.html': `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${name}</title>
  <script type="module" src="./src/main.ts"></script>
</head>
<body style="margin:0;font-family:system-ui;">
  <header style="padding:16px;border-bottom:1px solid #ddd;">
    <h1 style="margin:0;font-size:20px;">${name}</h1>
    <p style="margin:4px 0 0 0;color:#6b7280;font-size:13px;">SaaSAgent host shell</p>
  </header>
  <main style="display:grid;grid-template-columns:1fr 360px;gap:16px;padding:16px;height:calc(100vh - 80px);">
    <section>
      <h2>Mock host content</h2>
      <p>The agent panel on the right is the embedded SaaSAgent shell.</p>
    </section>
    <aside>
      <saas-agent runtime="http://localhost:8080" mode="side-panel"></saas-agent>
    </aside>
  </main>
</body>
</html>
`,
    'src/main.ts': `import '@saasagent/web-shell';
console.log('[${name}] saas-agent custom element registered.');
`,
    'README.md': `# ${name}

A SaaSAgent host application scaffolded by \`saasagent init host\`.

## Run

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

Make sure the SaaSAgent runtime is running on http://localhost:8080.
`,
    '.gitignore': `node_modules
dist
.vite
*.tsbuildinfo
.env
.env.local
`,
  };
  await writeAll(dir, files);
}

async function writeAll(dir: string, files: Record<string, string>): Promise<void> {
  for (const [relPath, content] of Object.entries(files)) {
    const full = join(dir, relPath);
    await fs.mkdir(dirname(full), { recursive: true });
    await fs.writeFile(full, content, 'utf-8');
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  registry
// ────────────────────────────────────────────────────────────────────────────

interface ApiOptions {
  runtimeUrl: string;
  token?: string;
}

function apiOptions(flags: Record<string, string | true>): ApiOptions {
  const runtimeUrl =
    (typeof flags.runtime === 'string' && flags.runtime) ||
    process.env.SAASAGENT_RUNTIME_URL ||
    'http://localhost:8080';
  const token =
    (typeof flags.token === 'string' && flags.token) || process.env.SAASAGENT_AUTH_TOKEN || undefined;
  const opts: ApiOptions = { runtimeUrl };
  if (token) opts.token = token;
  return opts;
}

function authHeaders(opts: ApiOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  return headers;
}

async function cmdRegistry(positional: string[], flags: Record<string, string | true>): Promise<void> {
  const verb = positional[0];
  const opts = apiOptions(flags);
  if (!verb) {
    process.stderr.write('usage: saasagent registry <list|put-skills|put-tools|put-features|put-subagents> [args]\n');
    process.exitCode = 1;
    return;
  }
  if (verb === 'list') {
    const res = await fetch(`${opts.runtimeUrl}/health`, { headers: authHeaders(opts) });
    const body = await res.json();
    process.stdout.write(JSON.stringify(body, null, 2) + '\n');
    return;
  }
  const putMatch = /^put-(skills|tools|features|subagents)$/.exec(verb);
  if (putMatch) {
    const which = putMatch[1]!;
    const file = positional[1];
    if (!file) {
      process.stderr.write(`usage: saasagent registry ${verb} <path-to-json>\n`);
      process.exitCode = 1;
      return;
    }
    const json = await fs.readFile(resolve(file), 'utf-8');
    const res = await fetch(`${opts.runtimeUrl}/registry/${which}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json', ...authHeaders(opts) },
      body: json,
    });
    const text = await res.text();
    if (!res.ok) {
      process.stderr.write(`PUT failed: HTTP ${res.status} ${text}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(text + '\n');
    return;
  }
  process.stderr.write(`unknown registry verb: ${verb}\n`);
  process.exitCode = 1;
}

// ────────────────────────────────────────────────────────────────────────────
//  eval
// ────────────────────────────────────────────────────────────────────────────

async function cmdEval(positional: string[], flags: Record<string, string | true>): Promise<void> {
  const verb = positional[0];
  const opts = apiOptions(flags);
  if (!verb) {
    process.stderr.write('usage: saasagent eval <list|churn|churn-session> [args]\n');
    process.exitCode = 1;
    return;
  }
  if (verb === 'list') {
    const res = await fetch(`${opts.runtimeUrl}/eval`, { headers: authHeaders(opts) });
    process.stdout.write((await res.text()) + '\n');
    return;
  }
  if (verb === 'churn') {
    const res = await fetch(`${opts.runtimeUrl}/churn`, { headers: authHeaders(opts) });
    process.stdout.write((await res.text()) + '\n');
    return;
  }
  if (verb === 'churn-session') {
    const id = positional[1];
    if (!id) {
      process.stderr.write('usage: saasagent eval churn-session <session-id>\n');
      process.exitCode = 1;
      return;
    }
    const res = await fetch(`${opts.runtimeUrl}/churn/sessions/${encodeURIComponent(id)}`, {
      headers: authHeaders(opts),
    });
    process.stdout.write((await res.text()) + '\n');
    return;
  }
  process.stderr.write(`unknown eval verb: ${verb}\n`);
  process.exitCode = 1;
}

// Detect direct invocation (CLI mode) vs library import (test mode).
// When loaded via `import {...} from '@saasagent/cli'` the entry is not the
// process's main module, and we skip the `await main()`.
const isMain = (() => {
  try {
    const entryPoint = process.argv[1];
    if (!entryPoint) return false;
    return import.meta.url.endsWith(entryPoint.replace(/\\/g, '/').split('/').pop() ?? '');
  } catch {
    return false;
  }
})();

if (isMain) {
  void main().catch((err: unknown) => {
    process.stderr.write(`saasagent: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
