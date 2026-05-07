/**
 * ConsoleTelemetry — pretty-prints structured logs + metrics + span timings.
 *
 * Dev default. JSON-line format when `format: 'json'` is set; human-readable
 * otherwise. Uses `console.log/warn/error` directly so it composes with
 * existing log streams.
 *
 * Spans capture wall-clock duration (ms) and emit a single log line on
 * completion or error, plus a metric `span.<name>.duration_ms`.
 */

import type { LogContext, LogLevel, SpanAttrs, Telemetry } from './types.js';

export interface ConsoleTelemetryOptions {
  /** Output format. 'human' = pretty for terminals; 'json' = JSON Lines for log shippers. */
  format?: 'human' | 'json';
  /** Min level emitted. Default 'info'. */
  level?: LogLevel;
  /** Override the time source (tests). */
  now?: () => number;
}

const LEVEL_RANK: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class ConsoleTelemetry implements Telemetry {
  readonly name = 'console';
  private readonly format: 'human' | 'json';
  private readonly minLevel: number;
  private readonly now: () => number;

  constructor(opts: ConsoleTelemetryOptions = {}) {
    this.format = opts.format ?? 'human';
    this.minLevel = LEVEL_RANK[opts.level ?? 'info'];
    this.now = opts.now ?? (() => Date.now());
  }

  log(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (LEVEL_RANK[level] < this.minLevel) return;
    if (this.format === 'json') {
      const payload = { ts: new Date(this.now()).toISOString(), level, msg, ...(ctx ?? {}) };
      this.write(level, JSON.stringify(payload));
    } else {
      const tag = level.toUpperCase().padEnd(5);
      const ctxStr = ctx ? ' ' + Object.entries(ctx).map(([k, v]) => `${k}=${formatValue(v)}`).join(' ') : '';
      this.write(level, `[${tag}] ${msg}${ctxStr}`);
    }
  }

  metric(name: string, value: number, tags?: SpanAttrs): void {
    if (LEVEL_RANK['debug'] < this.minLevel) return;
    if (this.format === 'json') {
      this.write('info', JSON.stringify({ ts: new Date(this.now()).toISOString(), kind: 'metric', name, value, tags: tags ?? {} }));
    } else {
      const tagsStr = tags ? ' ' + Object.entries(tags).map(([k, v]) => `${k}=${formatValue(v)}`).join(' ') : '';
      this.write('info', `[METRIC] ${name}=${value}${tagsStr}`);
    }
  }

  async span<T>(name: string, fn: () => Promise<T>, attrs?: SpanAttrs): Promise<T> {
    const start = this.now();
    try {
      const result = await fn();
      const dur = this.now() - start;
      this.metric(`span.${name}.duration_ms`, dur, { ...(attrs ?? {}), status: 'ok' });
      this.log('debug', `span ${name} ok in ${dur}ms`, attrs as LogContext | undefined);
      return result;
    } catch (err) {
      const dur = this.now() - start;
      this.metric(`span.${name}.duration_ms`, dur, { ...(attrs ?? {}), status: 'error' });
      this.log('error', `span ${name} failed in ${dur}ms: ${err instanceof Error ? err.message : String(err)}`, {
        ...(attrs ?? {}),
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private write(level: LogLevel, line: string): void {
    // Route to the appropriate console method so log shippers split correctly.
    /* eslint-disable no-console */
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
    /* eslint-enable no-console */
  }
}

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return v.includes(' ') ? `"${v}"` : v;
  return String(v);
}
