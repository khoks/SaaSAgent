/**
 * OpenTelemetryAdapter — Phase 6 (Bucket C.2).
 *
 * Bridges Telemetry → an OpenTelemetry SDK without requiring @opentelemetry/*
 * as a hard dep. Hosts pass minimal { tracer, meter, logger } implementations
 * matching the OTel API contracts; we relay calls into them.
 *
 * For drop-in OTel compatibility, hosts typically construct via:
 *
 *   import { trace, metrics } from '@opentelemetry/api';
 *   const tel = new OpenTelemetryAdapter({
 *     tracer: trace.getTracer('saasagent', '1.0.0'),
 *     meter:  metrics.getMeter('saasagent', '1.0.0'),
 *   });
 */

import type { LogContext, LogLevel, SpanAttrs, Telemetry } from './types.js';

/** Minimal Tracer-shape — just enough of OTel's contract to start/end spans. */
export interface OtelTracer {
  startSpan(name: string, attrs?: { attributes?: Readonly<Record<string, unknown>> }): {
    setAttribute(key: string, value: unknown): void;
    setStatus(status: { code: number; message?: string }): void;
    recordException(err: unknown): void;
    end(): void;
  };
}

/** Minimal Meter-shape — counter + histogram for metric() relays. */
export interface OtelMeter {
  createCounter(name: string): { add(value: number, attrs?: Readonly<Record<string, unknown>>): void };
  createHistogram(name: string): { record(value: number, attrs?: Readonly<Record<string, unknown>>): void };
}

/** Minimal Logger-shape (OTel logs API). */
export interface OtelLogger {
  emit(record: {
    severityNumber: number;
    severityText: string;
    body: string;
    attributes?: Readonly<Record<string, unknown>>;
  }): void;
}

export interface OpenTelemetryAdapterOptions {
  tracer: OtelTracer;
  meter: OtelMeter;
  /** Optional logger; falls back to console when absent. */
  logger?: OtelLogger;
}

/** OTel Span StatusCode — duplicated here so we don't need the @opentelemetry/api import. */
const SpanStatusCode = { UNSET: 0, OK: 1, ERROR: 2 };

const SEV_NUMBER: Record<LogLevel, number> = { debug: 5, info: 9, warn: 13, error: 17 };

export class OpenTelemetryAdapter implements Telemetry {
  readonly name = 'opentelemetry';
  private readonly tracer: OtelTracer;
  private readonly meter: OtelMeter;
  private readonly logger: OtelLogger | undefined;
  private readonly counters = new Map<string, ReturnType<OtelMeter['createCounter']>>();
  private readonly histograms = new Map<string, ReturnType<OtelMeter['createHistogram']>>();

  constructor(opts: OpenTelemetryAdapterOptions) {
    this.tracer = opts.tracer;
    this.meter = opts.meter;
    if (opts.logger) this.logger = opts.logger;
  }

  log(level: LogLevel, msg: string, ctx?: LogContext): void {
    if (this.logger) {
      this.logger.emit({
        severityNumber: SEV_NUMBER[level],
        severityText: level.toUpperCase(),
        body: msg,
        attributes: (ctx as Readonly<Record<string, unknown>>) ?? {},
      });
      return;
    }
    // No OTel logger configured — fall back to console with simple JSON line.
    /* eslint-disable no-console */
    const out = JSON.stringify({ level, msg, ...(ctx ?? {}) });
    if (level === 'error') console.error(out);
    else if (level === 'warn') console.warn(out);
    else console.log(out);
    /* eslint-enable no-console */
  }

  metric(name: string, value: number, tags?: SpanAttrs): void {
    // Heuristic: treat names ending in `.duration_ms` / `.bytes` / `.count` as
    // histograms (they're observed, not just incremented). Everything else is
    // a counter. Hosts that want different semantics can filter at the SDK.
    const isHistogram = /(_ms|_bytes|_count|_size)$/.test(name);
    if (isHistogram) {
      const h =
        this.histograms.get(name) ??
        (this.histograms.set(name, this.meter.createHistogram(name)).get(name) as ReturnType<OtelMeter['createHistogram']>);
      h.record(value, tags as Readonly<Record<string, unknown>> | undefined);
    } else {
      const c =
        this.counters.get(name) ??
        (this.counters.set(name, this.meter.createCounter(name)).get(name) as ReturnType<OtelMeter['createCounter']>);
      c.add(value, tags as Readonly<Record<string, unknown>> | undefined);
    }
  }

  async span<T>(name: string, fn: () => Promise<T>, attrs?: SpanAttrs): Promise<T> {
    const span = this.tracer.startSpan(name, { attributes: attrs as Readonly<Record<string, unknown>> | undefined });
    try {
      const r = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
      return r;
    } catch (err) {
      span.recordException(err);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : String(err),
      });
      span.end();
      throw err;
    }
  }
}
