import { describe, it, expect } from 'vitest';
import { trainChurnWeights, type LabeledSample } from './training.js';
import type { FeatureVector } from './weighted-feature.js';

const features = (o: Partial<FeatureVector> = {}): FeatureVector => ({
  negativeRatio: 0,
  noCompletion: 0,
  recentNegative: 0,
  avgScoreInverted: 0,
  logSessionLength: 0,
  ...o,
});

describe('trainChurnWeights', () => {
  it('throws on empty input', () => {
    expect(() => trainChurnWeights([])).toThrow(/at least one/);
  });

  it('separates a linearly-separable dataset (negativeRatio drives churn)', () => {
    // 50 retained sessions: low negativeRatio, churned=0.
    // 50 churned sessions:  high negativeRatio, churned=1.
    const samples: LabeledSample[] = [];
    for (let i = 0; i < 50; i++) samples.push({ features: features({ negativeRatio: 0.1 }), churned: 0 });
    for (let i = 0; i < 50; i++) samples.push({ features: features({ negativeRatio: 0.9 }), churned: 1 });
    const r = trainChurnWeights(samples, { epochs: 300, seed: 42 });
    expect(r.trainAccuracy).toBeGreaterThan(0.95);
    // negativeRatio coefficient should grow positive (churn-correlated).
    expect(r.weights.negativeRatio).toBeGreaterThan(0);
  });

  it('learns the right sign on noCompletion when it correlates with churn', () => {
    const samples: LabeledSample[] = [];
    for (let i = 0; i < 30; i++) samples.push({ features: features({ noCompletion: 0 }), churned: 0 });
    for (let i = 0; i < 30; i++) samples.push({ features: features({ noCompletion: 1 }), churned: 1 });
    const r = trainChurnWeights(samples, { epochs: 200, seed: 1 });
    expect(r.weights.noCompletion).toBeGreaterThan(0);
  });

  it('produces history with monotonically-decreasing loss (mostly)', () => {
    const samples: LabeledSample[] = [];
    for (let i = 0; i < 40; i++) {
      samples.push({ features: features({ negativeRatio: Math.random() }), churned: i % 2 === 0 ? 0 : 1 });
    }
    const r = trainChurnWeights(samples, { epochs: 50, seed: 1 });
    expect(r.history).toHaveLength(50);
    // Last loss should be strictly lower than first (any sane gradient descent).
    expect(r.history[49]!).toBeLessThan(r.history[0]!);
  });

  it('respects epoch count via callback', () => {
    const samples: LabeledSample[] = [{ features: features({ negativeRatio: 1 }), churned: 1 }];
    const seen: number[] = [];
    trainChurnWeights(samples, {
      epochs: 5,
      seed: 1,
      onEpoch: (epoch) => seen.push(epoch),
    });
    expect(seen).toEqual([0, 1, 2, 3, 4]);
  });

  it('honors custom initial weights (warm start)', () => {
    const samples: LabeledSample[] = [
      { features: features({ negativeRatio: 1 }), churned: 1 },
      { features: features({ negativeRatio: 0 }), churned: 0 },
    ];
    const r = trainChurnWeights(samples, {
      epochs: 0, // no training — verify we get back the warm start.
      initialWeights: {
        bias: -1,
        negativeRatio: 5,
        noCompletion: 0,
        recentNegative: 0,
        avgScoreInverted: 0,
        logSessionLength: 0,
      },
    });
    expect(r.weights.negativeRatio).toBe(5);
    expect(r.weights.bias).toBe(-1);
  });

  it('determinism: same seed → same weights', () => {
    const samples: LabeledSample[] = Array.from({ length: 30 }, (_, i) => ({
      features: features({ negativeRatio: i % 2 === 0 ? 0.1 : 0.9 }),
      churned: i % 2 === 0 ? 0 : 1,
    }));
    const a = trainChurnWeights(samples, { epochs: 50, seed: 12345 });
    const b = trainChurnWeights(samples, { epochs: 50, seed: 12345 });
    expect(a.weights).toEqual(b.weights);
  });

  it('reports trainAccuracy + samples in the result', () => {
    const samples: LabeledSample[] = [
      { features: features({ negativeRatio: 0.1 }), churned: 0 },
      { features: features({ negativeRatio: 0.9 }), churned: 1 },
    ];
    const r = trainChurnWeights(samples, { epochs: 100, seed: 1 });
    expect(r.samples).toBe(2);
    expect(r.trainAccuracy).toBeGreaterThanOrEqual(0.5);
    expect(r.finalLoss).toBeGreaterThan(0);
  });
});
