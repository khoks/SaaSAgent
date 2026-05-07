/**
 * trainChurnWeights — Phase 6 (Bucket C.4).
 *
 * Fits ChurnWeights from labeled (features, churned) samples via gradient
 * descent on the logistic loss. No ML-library dependency — pure numeric code
 * matching the linear model the WeightedFeatureChurnCalculator already uses.
 *
 * Loss:    L(w) = -mean[y·log(σ(w·x)) + (1-y)·log(1-σ(w·x))] + λ/2·||w||²
 * Update:  w  := w - η·(σ(w·x) - y)·x  (per-example) or batched mean
 *
 * The training loop reports per-epoch loss (host can plot to confirm
 * convergence). Defaults: 200 epochs, lr=0.1, l2=1e-3 — these are tuned for
 * the small feature space (5 features + bias) and small datasets (10s–1000s
 * of labeled sessions). For larger datasets call with explicit options.
 *
 * The output is a ready-to-use ChurnWeights object that drops into a new
 * WeightedFeatureChurnCalculator instance — no additional plumbing.
 */

import type { ChurnWeights, FeatureVector } from './weighted-feature.js';
import { DEFAULT_WEIGHTS } from './weighted-feature.js';

export interface LabeledSample {
  features: FeatureVector;
  /** 1 if the session churned (negative outcome), 0 if retained. */
  churned: 0 | 1;
}

export interface TrainOptions {
  /** Number of full passes over the data. Default 200. */
  epochs?: number;
  /** Learning rate. Default 0.1. */
  learningRate?: number;
  /** L2 regularization. Default 1e-3. */
  l2?: number;
  /** Starting weights. Default DEFAULT_WEIGHTS (warm-start). */
  initialWeights?: ChurnWeights;
  /** Optional per-epoch callback for plotting / early stopping. */
  onEpoch?: (epoch: number, loss: number) => void;
  /** Random seed for shuffling. Default time-based. */
  seed?: number;
}

export interface TrainResult {
  weights: ChurnWeights;
  /** Final mean cross-entropy loss. */
  finalLoss: number;
  /** Loss per epoch (for convergence plots). */
  history: number[];
  /** Number of training samples. */
  samples: number;
  /** Empirical accuracy on the training set (sanity check, not generalization). */
  trainAccuracy: number;
}

/** Standard logistic. */
function sigmoid(z: number): number {
  if (z >= 0) {
    const ez = Math.exp(-z);
    return 1 / (1 + ez);
  }
  const ez = Math.exp(z);
  return ez / (1 + ez);
}

const FEATURE_KEYS = [
  'negativeRatio',
  'noCompletion',
  'recentNegative',
  'avgScoreInverted',
  'logSessionLength',
] as const;

function dot(w: ChurnWeights, x: FeatureVector): number {
  let s = w.bias;
  for (const k of FEATURE_KEYS) s += w[k] * x[k];
  return s;
}

function clone(w: ChurnWeights): ChurnWeights {
  return { ...w };
}

/** Mulberry32 PRNG for deterministic shuffles. */
function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
}

export function trainChurnWeights(
  samples: ReadonlyArray<LabeledSample>,
  opts: TrainOptions = {},
): TrainResult {
  if (samples.length === 0) {
    throw new Error('trainChurnWeights: at least one labeled sample is required');
  }
  const epochs = opts.epochs ?? 200;
  const lr = opts.learningRate ?? 0.1;
  const l2 = opts.l2 ?? 1e-3;
  const seed = opts.seed ?? (Date.now() & 0xffffffff);
  const rand = rng(seed);

  let w = clone(opts.initialWeights ?? DEFAULT_WEIGHTS);
  const history: number[] = [];
  // Working copy of the dataset that we shuffle each epoch.
  const data = [...samples];

  for (let epoch = 0; epoch < epochs; epoch++) {
    shuffle(data, rand);
    let totalLoss = 0;
    for (const s of data) {
      const z = dot(w, s.features);
      const p = sigmoid(z);
      // Loss for this sample:
      // -[y·log p + (1-y)·log(1-p)] — clamped to avoid log(0).
      const eps = 1e-12;
      const li = -(s.churned * Math.log(Math.max(p, eps)) + (1 - s.churned) * Math.log(Math.max(1 - p, eps)));
      totalLoss += li;

      // Gradient step:  ∂L/∂w_j = (p - y) · x_j  (+ λ·w_j for L2).
      const err = p - s.churned;
      // bias has no L2 (standard convention)
      w.bias = w.bias - lr * err;
      for (const k of FEATURE_KEYS) {
        const grad = err * s.features[k] + l2 * w[k];
        w[k] = w[k] - lr * grad;
      }
    }
    const meanLoss = totalLoss / data.length;
    history.push(meanLoss);
    opts.onEpoch?.(epoch, meanLoss);
  }

  const finalLoss = history[history.length - 1] ?? 0;

  // Compute training accuracy.
  let correct = 0;
  for (const s of samples) {
    const p = sigmoid(dot(w, s.features));
    const pred = p >= 0.5 ? 1 : 0;
    if (pred === s.churned) correct += 1;
  }

  return {
    weights: w,
    finalLoss,
    history,
    samples: samples.length,
    trainAccuracy: correct / samples.length,
  };
}
