/**
 * Churn module barrel — Phase 2.6.
 *
 *   • RuleBasedChurnCalculator (2.6)   — statistical v0; ships today.
 *   • MLChurnCalculator        (2.6.x) — trained model; same interface.
 */

export type { ChurnRiskCalculator } from './types.js';
export {
  RuleBasedChurnCalculator,
  type RuleBasedChurnCalculatorOptions,
} from './rule-based.js';
export {
  WeightedFeatureChurnCalculator,
  DEFAULT_WEIGHTS,
  type WeightedFeatureChurnCalculatorOptions,
  type ChurnWeights,
  type FeatureVector,
} from './weighted-feature.js';
