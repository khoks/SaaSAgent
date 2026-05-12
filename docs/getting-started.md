# Getting Started — From clone to running demo in under 60 minutes

This guide walks you from a fresh clone of SaaSAgent to a running embedded
agent inside the Expedia reference integration. Target time: 10 minutes
for the local dev path; 60 minutes including Docker Compose with the full
polyglot data plane.

## Prerequisites

| Software | Version | Why |
|---|---|---|
| Node.js | 20+ | Runtime + tooling |
| pnpm | 9+ | Workspace package manager |
| Docker Desktop | latest | Optional — only for the polyglot data plane |
| `ANTHROPIC_API_KEY` env var | — | Optional — required only for `SonnetPlanner` + `HaikuComposer`; falls back to stubs without it |

## Path 1 — Embedded agent demo (10 minutes)

Verifies the data plane, UI shell, three-tier capability model, eval
dashboard, quota banner, and proactive engine — all in-process.

```bash
git clone <repo-url> saasagent
cd saasagent
pnpm install
pnpm build
```

Open three terminals.

**Terminal 1 — runtime (port 8080):**
```bash
node apps/demo-expedia/server/start-runtime.mjs
```
Look for:
```
[expedia-runtime] ready on :8080
  • skills: expedia.search-flights, expedia.search-hotels, ...
  • sub-agents: trip-planner → http://localhost:8082/federate
```

**Terminal 2 — sub-agent (port 8082):**
```bash
node apps/demo-expedia/server/start-trip-planner.mjs
```

**Terminal 3 — host page (port 5175):**
```bash
pnpm --filter @saasagent/demo-expedia dev
```

Open three browser tabs:

| URL | What you'll see |
|---|---|
| `http://localhost:5175/` | Mock Expedia site with the embedded agent in the right rail |
| `http://localhost:8080/dashboard` | Live per-capability eval metrics (auto-refreshes every 3s) |
| `http://localhost:8080/health` | JSON config — verify your tier setup + proactive engine wiring |

Try these in the host page:

1. **Reactive turn** — type "show me flights to Tokyo" in the agent panel; layout updates.
2. **Quota banner** — send messages on the free tier (5/day default). After the 5th the banner turns red and the 6th is rejected without invoking the planner.
3. **Proactive nudge** — leave the page idle for ~10 seconds. A proactive layout arrives unprompted with intent `expedia:bundle-savings-nudge`.
4. **Eval dashboard** — drive any skill via the UI or curl, watch the worst-first cards update live.

## Path 2 — Full polyglot data plane (60 minutes)

For when you want PostgreSQL + Qdrant + Redpanda + ClickHouse + Neo4j behind
the providers (so memory, eval, events, and graph all persist).

```bash
pnpm infra:up    # docker compose up -d
```

Wait for all containers to be healthy (`docker ps` should show 5 services).

Then construct your `Runtime` with the durable providers:

```ts
import {
  Runtime,
  PostgresMemoryProvider,
  ClickHouseEvalProvider,
  KafkaEventStream,
  Neo4jGraphProvider,
  QdrantMemoryProvider,
} from '@saasagent/runtime';

const runtime = new Runtime({
  port: 8080,
  postgresUrl: 'postgres://saasagent:saasagent@localhost:5432/saasagent',
  qdrantUrl: 'http://localhost:6333',
  clickhouseUrl: 'http://localhost:8123',
  kafkaBrokers: ['localhost:19092'],
  neo4jUrl: 'bolt://localhost:7687',
});
await runtime.start();
```

(All providers also work standalone — pass an `InMemory*` variant for any
slot you don't need durable yet.)

## Path 3 — Building your own host integration

Copy `apps/demo-expedia/` as a template. The integration surface is:

1. **Server-side capabilities** — register skills/tools/sub-agents in your
   runtime startup. See [server/start-runtime.mjs](../apps/demo-expedia/server/start-runtime.mjs).
2. **Host-side feature + tool registration** — PUT/POST to `/registry/*`
   from your page so the planner has your domain context. See
   [src/main.ts:seedRuntime](../apps/demo-expedia/src/main.ts).
3. **DOM observation tags** — sprinkle `data-saas-agent-observe="..."`
   on regions the agent should track + dispatch `saasagent:event` custom
   events on semantic moments.

## Troubleshooting

- **`mode=STUB` in `/health`** — no `ANTHROPIC_API_KEY` set. UI + data plane
  still work; planner just doesn't translate text → skills. Drive capabilities
  via `/executor/skill/<name>` (see `devHint` block in `/health`).
- **CORS errors in browser** — runtime sets `Access-Control-Allow-Origin: *`
  on all responses. If you see CORS errors, the runtime isn't running or is
  on a different port than `<saas-agent runtime="...">` declares.
- **`Port 5175 is already in use`** — orphan Vite from a prior session; kill
  the process holding that port and retry.

## Next steps

- Read the [architecture overview](./architecture/overview.md).
- Browse the [38 ADRs](./architecture/adr/).
- See the [Expedia integration walkthrough](../apps/demo-expedia/).
- For OSS publication readiness, see [docs/operations/nfr-validation.md](./operations/nfr-validation.md).
