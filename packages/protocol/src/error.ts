/**
 * ErrorEnvelope — typed-JSON error message emitted by the runtime to the shell
 * when an operation fails (composer failure, planner failure, transport error,
 * etc.). Wire format per ADR-038: SSE `event: <category>` with envelope as data.
 *
 * The category-as-event-name design avoids EventSource's native `error` event
 * (which fires on connection-level errors with no `.data` payload). Server-sent
 * errors use specific category names so the client can `addEventListener`
 * directly without ambiguity.
 */

export type ErrorCategory =
  | 'composer-error'
  | 'planner-error'
  | 'transport-error'
  | 'tool-error'
  | 'subagent-error'
  | 'unknown-error';

export const ERROR_CATEGORIES: readonly ErrorCategory[] = [
  'composer-error',
  'planner-error',
  'transport-error',
  'tool-error',
  'subagent-error',
  'unknown-error',
] as const;

export interface ErrorEnvelope {
  /** Error category — also used as SSE event name. */
  category: ErrorCategory;
  /** Short machine-readable error code (provider-error, compose-failed, etc.). */
  code: string;
  /** Human-readable message. Safe to surface to the shell. */
  message: string;
  /** Whether the client should retry the operation that caused this error. */
  retryable: boolean;
  /** ISO-8601 timestamp. */
  emittedAt: string;
  /** Optional: compose-cycle ID this error is associated with. */
  composeCycleId?: string;
  /** Optional: upstream provider request ID for debugging (e.g. Anthropic request_id). */
  requestId?: string;
}
