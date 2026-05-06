/**
 * PostgresMemoryProvider — Phase 2.3.x.
 *
 * Production-grade durable memory backed by Postgres. Implements the same
 * MemoryProvider interface so it slots in via Runtime.memoryProvider with no
 * planner/transport refactor.
 *
 * Schema (auto-created on first connect via ensureSchema()):
 *
 *   CREATE TABLE IF NOT EXISTS saasagent_turns (
 *     id          BIGSERIAL PRIMARY KEY,
 *     session_id  TEXT      NOT NULL,
 *     user_id     TEXT,
 *     speaker     TEXT      NOT NULL,
 *     text        TEXT      NOT NULL,
 *     at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
 *   );
 *   CREATE INDEX IF NOT EXISTS idx_saasagent_turns_session_at
 *     ON saasagent_turns (session_id, at DESC);
 *
 * Dependency strategy: rather than hard-depending on `pg`, we accept any
 * client-shape that exposes `query(sql, params)` returning `{ rows: T[] }`.
 * Hosts pass their own pg.Client / pg.Pool instance, or any compatible
 * adapter (postgres.js, neon, etc.). This keeps the runtime package free of
 * a heavy native dep until the host opts in.
 *
 * Connection pooling is the host's concern — pass a Pool, not a Client.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import type { MemoryProvider, MemoryQuery } from './types.js';

/**
 * Minimal contract any pg-compatible client satisfies. `pg.Pool`, `pg.Client`,
 * and `postgres.js` all match this shape.
 */
export interface PgClient {
  query<T = unknown>(
    sql: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: T[] }>;
}

export interface PostgresMemoryProviderOptions {
  /** Any pg-compatible client (Pool/Client). Host owns lifecycle. */
  client: PgClient;
  /** Override the default table name. Default `saasagent_turns`. */
  tableName?: string;
  /** Default recall limit when MemoryQuery.limit isn't set. Default 10. */
  defaultRecallLimit?: number;
  /** When true, ensureSchema() is auto-called on the first read/write. Default true. */
  autoMigrate?: boolean;
}

interface TurnRow {
  speaker: string;
  text: string;
  at: string | Date;
}

export class PostgresMemoryProvider implements MemoryProvider {
  readonly name = 'postgres';
  private readonly client: PgClient;
  private readonly tableName: string;
  private readonly defaultRecallLimit: number;
  private readonly autoMigrate: boolean;
  private migrated = false;
  private migratingPromise: Promise<void> | null = null;

  constructor(options: PostgresMemoryProviderOptions) {
    this.client = options.client;
    this.tableName = options.tableName ?? 'saasagent_turns';
    this.defaultRecallLimit = options.defaultRecallLimit ?? 10;
    this.autoMigrate = options.autoMigrate ?? true;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName)) {
      throw new Error(`Invalid Postgres table name: ${this.tableName}`);
    }
  }

  /** Ensure the turns table exists. Idempotent — safe to call multiple times. */
  async ensureSchema(): Promise<void> {
    if (this.migrated) return;
    if (this.migratingPromise) return this.migratingPromise;
    this.migratingPromise = this.runMigrations();
    try {
      await this.migratingPromise;
    } finally {
      this.migratingPromise = null;
    }
  }

  private async runMigrations(): Promise<void> {
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id          BIGSERIAL PRIMARY KEY,
        session_id  TEXT        NOT NULL,
        user_id     TEXT,
        speaker     TEXT        NOT NULL,
        text        TEXT        NOT NULL,
        at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await this.client.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_session_at
        ON ${this.tableName} (session_id, at DESC)
    `);
    this.migrated = true;
  }

  private async maybeMigrate(): Promise<void> {
    if (this.autoMigrate && !this.migrated) await this.ensureSchema();
  }

  async recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    await this.maybeMigrate();
    const sessionId = query.sessionId ?? '__default__';
    const limit = query.limit ?? this.defaultRecallLimit;
    // Pull most-recent N for this session, then return chronological for prompt readability.
    const { rows } = await this.client.query<TurnRow>(
      `SELECT speaker, text, at
         FROM ${this.tableName}
        WHERE session_id = $1
        ORDER BY at DESC
        LIMIT $2`,
      [sessionId, limit],
    );
    return rows
      .reverse()
      .map((row) => ({
        store: 'postgres' as const,
        summary: `${row.speaker} (${formatAt(row.at)}): ${truncate(row.text, 200)}`,
      }));
  }

  async record(turn: ConversationTurn, sessionId?: string): Promise<void> {
    await this.maybeMigrate();
    const sid = sessionId ?? '__default__';
    await this.client.query(
      `INSERT INTO ${this.tableName} (session_id, speaker, text, at)
       VALUES ($1, $2, $3, $4)`,
      [sid, turn.speaker, turn.text, turn.at],
    );
  }

  /** Inspection helper: pull all turns for a session (chronological). Used by /memory REST. */
  async getSession(sessionId: string): Promise<ReadonlyArray<ConversationTurn>> {
    await this.maybeMigrate();
    const { rows } = await this.client.query<TurnRow>(
      `SELECT speaker, text, at
         FROM ${this.tableName}
        WHERE session_id = $1
        ORDER BY at ASC`,
      [sessionId],
    );
    return rows.map((r) => ({
      speaker: r.speaker as 'user' | 'agent',
      text: r.text,
      at: formatAt(r.at),
    }));
  }

  /** All session ids with at least one turn. */
  async listSessions(): Promise<ReadonlyArray<string>> {
    await this.maybeMigrate();
    const { rows } = await this.client.query<{ session_id: string }>(
      `SELECT DISTINCT session_id FROM ${this.tableName} ORDER BY session_id`,
    );
    return rows.map((r) => r.session_id);
  }

  async clearSession(sessionId: string): Promise<boolean> {
    await this.maybeMigrate();
    const result = await this.client.query<{ ct: number }>(
      `WITH del AS (DELETE FROM ${this.tableName} WHERE session_id = $1 RETURNING 1)
       SELECT COUNT(*)::int AS ct FROM del`,
      [sessionId],
    );
    return (result.rows[0]?.ct ?? 0) > 0;
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function formatAt(at: string | Date): string {
  return at instanceof Date ? at.toISOString() : at;
}
