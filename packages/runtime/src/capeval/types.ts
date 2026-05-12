/**
 * Capability evaluation — Phase 6 / ADR-023.
 *
 * Auto-generated, per-capability quality evaluation. Where the existing
 * EvalProvider (Phase 2.5) records user-feedback signals (👍/👎/implicit
 * re-ask) on COMPOSED LAYOUTS, this module evaluates the quality of the
 * underlying CAPABILITY INVOCATIONS (skills, tools, sub-agents) that fed
 * those layouts.
 *
 * Novelty: the eval suite for each capability is AUTO-GENERATED from its
 * registry descriptor (no hand-authored eval per skill). Every registered
 * skill / tool / sub-agent gets:
 *   • heuristic checks derived from descriptor metadata (latency budget,
 *     output non-emptiness, ok rate)
 *   • optionally, sampled LLM-judge scoring against descriptor.whenToUse
 *     (deferred to a follow-up — requires API key)
 * The planner / executor stay decoupled; the runner subscribes to every
 * invocation via a callback hook attached to each Executor.
 *
 * Storage: in-process ring buffer of recent invocations + per-capability
 * aggregate rollups. ClickHouse-backed durable store comes in v1 (mirrors
 * the polyglot eval pattern from ADR-032).
 */

export type CapabilityKind = 'skill' | 'tool' | 'subagent';

/**
 * One execution of a capability (skill, tool, or sub-agent). Captured from
 * the executor's ExecutionResult plus the conversational context the invocation
 * happened inside. Records are stored in the eval store for both per-event
 * heuristic checks and aggregate rollups.
 */
export interface CapabilityInvocationRecord {
  /** Capability name (e.g. 'expedia.search-flights'). */
  name: string;
  kind: CapabilityKind;
  /** ISO-8601 timestamp at start of execution. */
  at: string;
  /** Causality token of the layout this invocation happened under. */
  composeCycleId?: string;
  /** Per-WS conversation id (when invoked from a WS turn). */
  sessionId?: string;
  /** Inputs passed to the executor. Stored for LLM-judge scoring + debug. */
  input?: unknown;
  /** Outputs returned by the handler. Only populated when ok=true. */
  output?: unknown;
  /** Did the executor return success? */
  ok: boolean;
  /** Executor error code (when ok=false). */
  errorCode?: string;
  errorMessage?: string;
  /** Wall-clock duration in milliseconds. */
  durationMs: number;
}

/** Result of running one heuristic against one invocation. */
export interface HeuristicCheckResult {
  /** Stable id of the heuristic (e.g. 'latency-budget'). */
  checkName: string;
  /** 0..1 score. 1 = passing, 0 = failing. */
  score: number;
  /** Free-text rationale for the score. */
  detail: string;
}

/**
 * A heuristic check that operates on a single invocation. Implementations
 * stay pure: same input → same output, no side effects, fast (< 1ms).
 */
export interface HeuristicCheck {
  readonly name: string;
  readonly description: string;
  /** Run the check. Should return a non-null result for every invocation. */
  evaluate(inv: CapabilityInvocationRecord): HeuristicCheckResult;
}

/**
 * Aggregate metrics for one capability, computed from its recorded invocations.
 * Returned by the runner's report endpoints; surfaced by /evals + the bundled
 * dashboard.
 */
export interface CapabilityReport {
  name: string;
  kind: CapabilityKind;
  totalInvocations: number;
  okCount: number;
  failureCount: number;
  /** ok / total in 0..1; 0 if no invocations. */
  successRate: number;
  medianLatencyMs: number;
  p95LatencyMs: number;
  /** Mean of every heuristic's mean score (0..1). Null when no heuristics ran. */
  overallScore: number | null;
  /** Per-heuristic mean score across all evaluated invocations. */
  perCheck: Record<string, { mean: number; sampleSize: number }>;
  /** Most recent invocation timestamp (ISO-8601). Null when no invocations. */
  lastSeenAt: string | null;
}

/**
 * Runner contract — what the rest of the runtime subscribes to and queries.
 */
export interface CapabilityEvalRunner {
  readonly name: string;
  /**
   * Record an invocation. Called from each Executor's onInvocation hook
   * after `execute()` resolves. Fire-and-forget; MUST NOT throw or block
   * the executor's caller.
   */
  recordInvocation(record: CapabilityInvocationRecord): void;
  /** Compute current metrics for one capability. Null when never seen. */
  reportFor(name: string): CapabilityReport | null;
  /** Compute current metrics for every capability seen so far. */
  reportAll(): readonly CapabilityReport[];
  /** Drop all recorded invocations (tests / admin reset). */
  reset?(): void;
}
