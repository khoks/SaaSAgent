/**
 * MeteringProvider — Phase 6 (Bucket C.7).
 *
 * Pluggable usage-event sink for the open-core hybrid pricing model. Per
 * ADR-020, certain runtime capabilities (premium composers, federated
 * sub-agents, multi-tenant management) are tracked as billable events and
 * rolled up by the host's billing pipeline.
 *
 * Provider-shape: `record(event)` is fire-and-forget — pricing pipelines
 * MUST NOT block the runtime's hot path. Implementations buffer + flush
 * out-of-band (queue → Stripe / Orb / internal billing service).
 *
 * Usage events the runtime emits:
 *   • plan_invocation       — one per planner.plan() call
 *   • compose_invocation    — one per composer.compose() call
 *   • model_tokens          — input + output tokens consumed (per provider call)
 *   • subagent_invocation   — federation calls (often premium)
 *   • feature_used          — host-tagged feature engagement
 *
 * Implementations:
 *   • NoopMeteringProvider     — drops everything; default.
 *   • ConsoleMeteringProvider  — pretty-prints to stdout; dev / debugging.
 *   • UsageMeteringProvider    — accumulates in-memory rollups; useful for
 *                                cron-flush patterns or test assertions.
 */

export type MeteringEventKind =
  | 'plan_invocation'
  | 'compose_invocation'
  | 'model_tokens'
  | 'subagent_invocation'
  | 'feature_used';

export interface MeteringEvent {
  kind: MeteringEventKind;
  /** Tenant + user attribution. */
  tenantId?: string;
  userId?: string;
  /** Numeric quantity (token count, invocation count, etc). Default 1. */
  quantity?: number;
  /** Free-form labels — model name, feature name, sub-agent id, etc. */
  tags?: Readonly<Record<string, string | number | boolean>>;
  /** ISO-8601 timestamp; runtime stamps if missing. */
  at?: string;
}

export interface MeteringProvider {
  readonly name: string;
  /** Fire-and-forget. Implementations MUST NOT throw — the runtime's hot path can't block. */
  record(event: MeteringEvent): void | Promise<void>;
  /** Optional: wait for in-flight buffers to drain (graceful shutdown). */
  flush?(): Promise<void>;
}

export class NoopMeteringProvider implements MeteringProvider {
  readonly name = 'noop';
  record(): void {
    /* drop */
  }
}
