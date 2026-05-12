/**
 * DefaultProactiveEngine — orchestrates scorer + budget, returns ProactiveDecision.
 *
 * Pure decision function. Side effects (compose, broadcast, log) live in
 * the caller (RuntimeServer's idle-tick loop). The engine ONLY consumes
 * budget when it intends to fire — denied decisions don't burn budget.
 */

import type {
  AttentionBudget,
  ProactiveContext,
  ProactiveDecision,
  ProactiveEngine,
  ProactiveScorer,
} from './types.js';
import { DefaultProactiveScorer } from './scorer.js';
import { InMemoryAttentionBudget } from './budget.js';

export interface DefaultProactiveEngineOptions {
  /** Score threshold (0..1) above which the engine considers firing. Default 0.6. */
  threshold?: number;
  /** Custom scorer. Default: DefaultProactiveScorer. */
  scorer?: ProactiveScorer;
  /** Custom budget. Default: InMemoryAttentionBudget. */
  budget?: AttentionBudget;
  /** Intent forwarded to the composer when fire=true. Default 'proactive-nudge'. */
  suggestedIntent?: string;
}

export class DefaultProactiveEngine implements ProactiveEngine {
  readonly name = 'default-proactive-engine-v0';
  readonly threshold: number;
  readonly scorer: ProactiveScorer;
  readonly budget: AttentionBudget;
  private readonly suggestedIntent: string;

  constructor(opts: DefaultProactiveEngineOptions = {}) {
    this.threshold = opts.threshold ?? 0.6;
    this.scorer = opts.scorer ?? new DefaultProactiveScorer();
    this.budget = opts.budget ?? new InMemoryAttentionBudget();
    this.suggestedIntent = opts.suggestedIntent ?? 'proactive-nudge';
  }

  evaluate(ctx: ProactiveContext): ProactiveDecision {
    const score = this.scorer.score(ctx);
    if (score.score < this.threshold) {
      return { fire: false, score, reason: 'below-threshold' };
    }
    if (!this.budget.tryConsume(ctx.sessionId)) {
      return { fire: false, score, reason: 'budget-exhausted' };
    }
    return { fire: true, score, suggestedIntent: this.suggestedIntent };
  }
}
