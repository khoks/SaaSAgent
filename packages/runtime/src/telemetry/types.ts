/**
 * Telemetry — Phase 6 (Bucket C.2).
 *
 * Pluggable observability surface. Three primitives:
 *
 *   • log(level, msg, ctx?)       — structured logs (info/warn/error/debug)
 *   • metric(name, value, tags?)  — counter / gauge / histogram increments
 *   • span(name, fn, attrs?)      — wrap an async operation with timing +
 *                                    success/failure attribution
 *
 * Implementations:
 *   • NoopTelemetry        — drops everything; default for tests.
 *   • ConsoleTelemetry     — pretty-prints structured logs + metrics; dev default.
 *   • OpenTelemetryAdapter — bridges to a host-supplied OTel SDK (Tracer +
 *                            Meter + Logger). Optional dependency-free.
 *
 * The runtime instruments hot paths (planner.plan, composer.compose, executor
 * dispatch, federation) by calling `telemetry.span(...)`.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  [k: string]: unknown;
}

export interface SpanAttrs {
  [k: string]: string | number | boolean | undefined;
}

export interface Telemetry {
  readonly name: string;
  log(level: LogLevel, msg: string, ctx?: LogContext): void;
  /** Increment a counter / record a gauge / observe a histogram. Tags are key=value labels. */
  metric(name: string, value: number, tags?: SpanAttrs): void;
  /**
   * Wrap an async operation. The implementation MAY:
   *   • Time the call (start/end timestamps).
   *   • Record errors with their thrown value.
   *   • Add attrs to the resulting span.
   *
   * Returns whatever the wrapped fn returns. On error, re-throws after
   * recording. Sync fns can be wrapped as `() => Promise.resolve(syncResult)`.
   */
  span<T>(name: string, fn: () => Promise<T>, attrs?: SpanAttrs): Promise<T>;
}

/** No-op default — tests and "I don't care about telemetry" production paths. */
export class NoopTelemetry implements Telemetry {
  readonly name = 'noop';
  log(): void {
    /* drop */
  }
  metric(): void {
    /* drop */
  }
  async span<T>(_name: string, fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
