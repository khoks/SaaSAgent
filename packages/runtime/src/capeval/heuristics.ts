/**
 * Built-in heuristic checks for auto-generated capability eval (Phase 6).
 *
 * Each heuristic operates on a single CapabilityInvocationRecord and returns
 * a 0..1 score with a rationale. The runner aggregates means across recent
 * invocations per (capability × check). This is the heuristic half of the
 * hybrid scoring from ADR-023 — every invocation gets checked; the sampled
 * LLM-judge half is a follow-up that composes with this same shape.
 */

import type {
  CapabilityInvocationRecord,
  HeuristicCheck,
  HeuristicCheckResult,
} from './types.js';

export interface LatencyBudgetCheckOptions {
  /** Target ms — invocations completing at or below score 1; degrades linearly to 0 at 4×target. */
  targetMs?: number;
}

/**
 * outcome-success — did the executor return ok=true?
 * Most blunt but most diagnostic: a capability that's failing constantly is
 * the first thing to fix regardless of latency or output shape.
 */
export const outcomeSuccessCheck: HeuristicCheck = {
  name: 'outcome-success',
  description: 'Invocation returned ok=true (no executor error).',
  evaluate(inv: CapabilityInvocationRecord): HeuristicCheckResult {
    return {
      checkName: 'outcome-success',
      score: inv.ok ? 1 : 0,
      detail: inv.ok
        ? 'ok'
        : `failed with ${inv.errorCode ?? 'unknown'}: ${inv.errorMessage ?? ''}`.trim(),
    };
  },
};

/**
 * output-non-empty — did the handler return a non-null, non-empty payload?
 * Catches the "ok but useless" failure mode where a skill returns {} or
 * an empty array when there was actually nothing to return.
 */
export const outputNonEmptyCheck: HeuristicCheck = {
  name: 'output-non-empty',
  description: 'Output is not null/undefined/empty.',
  evaluate(inv: CapabilityInvocationRecord): HeuristicCheckResult {
    if (!inv.ok) {
      // Failed invocations don't get scored on output shape — outcome-success
      // already captured the failure.
      return { checkName: 'output-non-empty', score: 0, detail: 'skipped (ok=false)' };
    }
    const out = inv.output;
    if (out === null || out === undefined) {
      return { checkName: 'output-non-empty', score: 0, detail: 'output is null/undefined' };
    }
    if (Array.isArray(out) && out.length === 0) {
      return { checkName: 'output-non-empty', score: 0, detail: 'output is empty array' };
    }
    if (typeof out === 'string' && out.length === 0) {
      return { checkName: 'output-non-empty', score: 0, detail: 'output is empty string' };
    }
    if (typeof out === 'object' && Object.keys(out as object).length === 0) {
      return { checkName: 'output-non-empty', score: 0, detail: 'output is empty object' };
    }
    return { checkName: 'output-non-empty', score: 1, detail: 'non-empty' };
  },
};

/**
 * latency-budget — was the invocation fast enough?
 * Scores 1 at or under the target; degrades linearly to 0 at 4× target. The
 * target is a tunable knob; sub-second targets fit most in-process skills,
 * larger targets for sub-agents (which include network round-trips).
 */
export function makeLatencyBudgetCheck(opts: LatencyBudgetCheckOptions = {}): HeuristicCheck {
  const target = opts.targetMs ?? 1000;
  return {
    name: 'latency-budget',
    description: `Invocation under ${target}ms (linear to 0 at 4×).`,
    evaluate(inv: CapabilityInvocationRecord): HeuristicCheckResult {
      const d = inv.durationMs;
      if (d <= target) return { checkName: 'latency-budget', score: 1, detail: `${d}ms ≤ ${target}ms` };
      const ratio = (d - target) / (3 * target);
      const score = Math.max(0, 1 - ratio);
      return {
        checkName: 'latency-budget',
        score,
        detail: `${d}ms / target ${target}ms → score ${score.toFixed(2)}`,
      };
    },
  };
}

/**
 * The default heuristic suite applied to every capability when no override
 * is provided. Three checks, all cheap, no I/O. Hosts can extend by passing
 * a custom list to CapabilityEvalRunner.
 */
export function defaultHeuristicSuite(opts: LatencyBudgetCheckOptions = {}): HeuristicCheck[] {
  return [outcomeSuccessCheck, outputNonEmptyCheck, makeLatencyBudgetCheck(opts)];
}
