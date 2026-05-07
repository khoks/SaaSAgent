/**
 * ClickHouseEvalProvider — Phase 2.5.x.
 *
 * Persists EvalSignals to ClickHouse for durable analytics + cohort rollups.
 * Same dependency-free shape as PostgresMemoryProvider — accepts a minimal
 * { query(sql, params) → { rows } } client so hosts can plug in clickhouse-client
 * or write their own HTTP wrapper.
 *
 * Schema (auto-created on first call via ensureSchema()):
 *
 *   CREATE TABLE saasagent_eval_signals (
 *     compose_cycle_id   String,
 *     session_id         String,
 *     user_id            String,
 *     signal             LowCardinality(String),
 *     source             LowCardinality(String),
 *     score              Nullable(Float32),
 *     comment            String,
 *     intent             String,
 *     at                 DateTime64(3) DEFAULT now64()
 *   )
 *   ENGINE = MergeTree
 *   PARTITION BY toYYYYMM(at)
 *   ORDER BY (session_id, at);
 *
 * Production reads typically aggregate via materialized views; this provider's
 * query() does the cheap recent-N path needed by the inspection REST endpoint.
 */

import type { EvalSignal } from '@saasagent/protocol';

import type { EvalFilter, EvalProvider } from './types.js';

/** Minimal contract any ClickHouse-compatible client satisfies. */
export interface ClickHouseClient {
  query<T = unknown>(
    sql: string,
    params?: ReadonlyArray<unknown>,
  ): Promise<{ rows: T[] }>;
}

export interface ClickHouseEvalProviderOptions {
  client: ClickHouseClient;
  /** Override the table name. Default `saasagent_eval_signals`. */
  tableName?: string;
  /** Default query limit. Default 100. */
  defaultQueryLimit?: number;
  /** When true, ensureSchema() is auto-called on the first read/write. Default true. */
  autoMigrate?: boolean;
}

interface SignalRow {
  compose_cycle_id: string;
  session_id: string;
  user_id: string;
  signal: string;
  source: string;
  score: number | null;
  comment: string;
  intent: string;
  at: string | Date;
}

export class ClickHouseEvalProvider implements EvalProvider {
  readonly name = 'clickhouse';
  private readonly client: ClickHouseClient;
  private readonly tableName: string;
  private readonly defaultQueryLimit: number;
  private readonly autoMigrate: boolean;
  private migrated = false;
  private migratingPromise: Promise<void> | null = null;
  private writeCount = 0;

  constructor(opts: ClickHouseEvalProviderOptions) {
    this.client = opts.client;
    this.tableName = opts.tableName ?? 'saasagent_eval_signals';
    this.defaultQueryLimit = opts.defaultQueryLimit ?? 100;
    this.autoMigrate = opts.autoMigrate ?? true;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(this.tableName)) {
      throw new Error(`Invalid ClickHouse table name: ${this.tableName}`);
    }
  }

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
        compose_cycle_id String,
        session_id       String,
        user_id          String,
        signal           LowCardinality(String),
        source           LowCardinality(String),
        score            Nullable(Float32),
        comment          String,
        intent           String,
        at               DateTime64(3) DEFAULT now64()
      )
      ENGINE = MergeTree
      PARTITION BY toYYYYMM(at)
      ORDER BY (session_id, at)
    `);
    this.migrated = true;
  }

  private async maybeMigrate(): Promise<void> {
    if (this.autoMigrate && !this.migrated) await this.ensureSchema();
  }

  async record(signal: EvalSignal): Promise<void> {
    await this.maybeMigrate();
    await this.client.query(
      `INSERT INTO ${this.tableName} (compose_cycle_id, session_id, user_id, signal, source, score, comment, intent, at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        signal.composeCycleId,
        signal.sessionId ?? '',
        signal.userId ?? '',
        signal.signal,
        signal.source,
        signal.score ?? null,
        signal.comment ?? '',
        signal.intent ?? '',
        signal.at,
      ],
    );
    this.writeCount += 1;
  }

  async query(filter: EvalFilter): Promise<ReadonlyArray<EvalSignal>> {
    await this.maybeMigrate();
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (filter.sessionId) {
      params.push(filter.sessionId);
      conditions.push(`session_id = $${params.length}`);
    }
    if (filter.composeCycleId) {
      params.push(filter.composeCycleId);
      conditions.push(`compose_cycle_id = $${params.length}`);
    }
    if (filter.signal) {
      params.push(filter.signal);
      conditions.push(`signal = $${params.length}`);
    }
    if (filter.since) {
      params.push(filter.since);
      conditions.push(`at >= parseDateTime64BestEffort($${params.length})`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(filter.limit ?? this.defaultQueryLimit);
    const sql = `
      SELECT compose_cycle_id, session_id, user_id, signal, source, score, comment, intent, at
        FROM ${this.tableName}
        ${where}
        ORDER BY at DESC
        LIMIT $${params.length}
    `;
    const { rows } = await this.client.query<SignalRow>(sql, params);
    return rows.map((r) => {
      const out: EvalSignal = {
        composeCycleId: r.compose_cycle_id,
        signal: r.signal as EvalSignal['signal'],
        source: r.source as EvalSignal['source'],
        at: typeof r.at === 'string' ? r.at : r.at.toISOString(),
      };
      if (r.session_id) out.sessionId = r.session_id;
      if (r.user_id) out.userId = r.user_id;
      if (r.score !== null && r.score !== undefined) out.score = r.score;
      if (r.comment) out.comment = r.comment;
      if (r.intent) out.intent = r.intent;
      return out;
    });
  }

  count(): number {
    return this.writeCount;
  }
}
