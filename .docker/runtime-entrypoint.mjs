/**
 * Container entrypoint — wires SAAS_AGENT_* env vars into the Runtime.
 *
 * Reads:
 *   ANTHROPIC_API_KEY            (passed through to AnthropicProvider)
 *   SAAS_AGENT_PORT              (default 8080)
 *   SAAS_AGENT_AUTH_TOKEN        (Phase 2.7 bearer auth; unset = open)
 *   SAAS_AGENT_RATE_LIMIT_REST   (req/min per IP; 0 disables)
 *   SAAS_AGENT_RATE_LIMIT_WS     (msg/min per WS conn; 0 disables)
 *   DATABASE_URL                 (when set: PostgresMemoryProvider; else KeyValue)
 */

const port = process.env.SAAS_AGENT_PORT ? Number(process.env.SAAS_AGENT_PORT) : 8080;
const authToken = process.env.SAAS_AGENT_AUTH_TOKEN || undefined;
const rateLimitRest = Number(process.env.SAAS_AGENT_RATE_LIMIT_REST ?? '0');
const rateLimitWs = Number(process.env.SAAS_AGENT_RATE_LIMIT_WS ?? '0');
const databaseUrl = process.env.DATABASE_URL;

const { Runtime, PostgresMemoryProvider, KeyValueMemoryProvider } = await import(
  '@saasagent/runtime'
);

const config = {
  port,
  ...(authToken ? { authToken } : {}),
  ...(rateLimitRest > 0 ? { rateLimitRestPerMinute: rateLimitRest } : {}),
  ...(rateLimitWs > 0 ? { rateLimitWsPerMinute: rateLimitWs } : {}),
};

const runtime = new Runtime(config);

// Memory provider — choose Postgres when DATABASE_URL is set, else KeyValue.
if (databaseUrl) {
  const pgMod = await import('pg').catch(() => null);
  if (!pgMod) {
    console.error(
      '[entrypoint] DATABASE_URL is set but `pg` is not installed; using KeyValueMemoryProvider',
    );
  } else {
    const pool = new pgMod.default.Pool({ connectionString: databaseUrl });
    runtime.memoryProvider = new PostgresMemoryProvider({ client: pool });
    console.log('[entrypoint] using PostgresMemoryProvider');
  }
} else {
  console.log('[entrypoint] using KeyValueMemoryProvider (DATABASE_URL not set)');
}

await runtime.start();

if (authToken) console.log(`[entrypoint] bearer auth enabled (token length=${authToken.length})`);
if (rateLimitRest > 0) console.log(`[entrypoint] REST rate limit: ${rateLimitRest} req/min/IP`);
if (rateLimitWs > 0) console.log(`[entrypoint] WS rate limit: ${rateLimitWs} msg/min/conn`);

const shutdown = async (sig) => {
  console.log(`[entrypoint] caught ${sig}, stopping…`);
  await runtime.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
