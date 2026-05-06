/**
 * Executor types — Phase 2.0c.
 *
 * The runtime grows two execution surfaces in this slice:
 *   • SkillExecutor — runs in-process / static-output skills the host registered.
 *   • ToolExecutor  — runs HTTP-callable tools via fetch + URL-template substitution.
 *
 * Both return a uniform `ExecutionResult` discriminated union so the planner
 * (Phase 2.1) can branch on `ok` and surface failures as ErrorEnvelopes without
 * needing executor-specific error handling.
 *
 * Per ADR-021's three-tier capability model: Tools (stateless HTTP) < Skills
 * (in-process) < Sub-Agents (federated runtimes — separate executor in Phase 2.4).
 */

export interface ExecutionContext {
  /**
   * Host-supplied per-request headers (used by tools with auth='host-supplied').
   * Allows the host to inject session-scoped auth without baking it into a
   * descriptor that's globally registered.
   */
  hostHeaders?: Readonly<Record<string, string>>;
  /** Compose cycle id for trace correlation. */
  composeCycleId?: string;
  /** Owner of the request (for downstream audit). */
  userId?: string;
}

export type ExecutionResult<T = unknown> =
  | { ok: true; output: T; durationMs: number }
  | { ok: false; error: ExecutionError; durationMs: number };

export type ExecutionErrorCode =
  /** No descriptor registered with the requested name. */
  | 'unknown-skill'
  | 'unknown-tool'
  /** Skill descriptor exists but no executable handler is registered for it. */
  | 'no-handler'
  /** Skill kind not yet supported by the executor (e.g. prompt-template in 2.0c). */
  | 'unsupported-kind'
  /** Tool descriptor's auth config is incomplete (e.g. bearer-env without authEnvVar). */
  | 'tool-config'
  /** URL template references {paramName} not provided in input. */
  | 'missing-input-param'
  /** Tool returned a non-2xx HTTP status. */
  | 'http-status'
  /** fetch() rejected (DNS, connection refused, etc). */
  | 'http-network'
  /** Tool exceeded its timeoutMs. */
  | 'timeout'
  /** Tool response Content-Type was JSON but body failed to parse. */
  | 'invalid-json'
  /** Skill handler threw / rejected. */
  | 'handler-threw';

export interface ExecutionError {
  code: ExecutionErrorCode;
  message: string;
  /** Original thrown value, if any. Not serialized over the wire — for logging only. */
  cause?: unknown;
  /** Populated for `code: 'http-status'`. */
  status?: number;
}
