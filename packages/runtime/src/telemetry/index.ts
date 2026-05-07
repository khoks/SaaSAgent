/**
 * Telemetry module barrel — Phase 6 (Bucket C.2).
 *
 *   • NoopTelemetry          — default; drops everything.
 *   • ConsoleTelemetry       — dev / single-host pretty logs + metric lines.
 *   • OpenTelemetryAdapter   — bridges to a host-supplied OTel SDK.
 */

export type { Telemetry, LogLevel, LogContext, SpanAttrs } from './types.js';
export { NoopTelemetry } from './types.js';
export { ConsoleTelemetry, type ConsoleTelemetryOptions } from './console.js';
export {
  OpenTelemetryAdapter,
  type OpenTelemetryAdapterOptions,
  type OtelTracer,
  type OtelMeter,
  type OtelLogger,
} from './opentelemetry.js';
