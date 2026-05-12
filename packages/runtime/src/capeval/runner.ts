/**
 * InMemoryCapabilityEvalRunner — Phase 6.
 *
 * In-process recorder + aggregator. Keeps a ring buffer of recent invocations
 * per capability so the rollups (success rate, p50/p95 latency, per-check mean)
 * stay bounded in memory but reflect recent behavior. The store IS the canonical
 * source of metrics for the bundled dashboard; a ClickHouse-backed durable
 * variant lands in v1 (same interface).
 *
 * Storage shape:
 *   Map<capabilityName, RingBuffer<CapabilityInvocationRecord>>
 *   plus a lightweight global running-total map so reports don't have to
 *   re-scan the full buffer for every request.
 */

import { defaultHeuristicSuite, type LatencyBudgetCheckOptions } from './heuristics.js';
import type {
  CapabilityEvalRunner,
  CapabilityInvocationRecord,
  CapabilityReport,
  HeuristicCheck,
  HeuristicCheckResult,
} from './types.js';

export interface InMemoryCapabilityEvalRunnerOptions {
  /** Per-capability ring buffer max size. Default 200. */
  bufferSize?: number;
  /** Override the default heuristic suite. */
  heuristics?: HeuristicCheck[];
  /** Tune the default latency-budget target. Ignored if heuristics is set. */
  latencyTargetMs?: number;
}

interface CapabilityBucket {
  name: string;
  kind: CapabilityInvocationRecord['kind'];
  invocations: CapabilityInvocationRecord[]; // ring buffer
  /** Heuristic results sit in parallel; index aligns with invocations. */
  checkResults: HeuristicCheckResult[][];
  lastSeenAt: string;
}

export class InMemoryCapabilityEvalRunner implements CapabilityEvalRunner {
  readonly name = 'in-memory-capability-eval';
  private readonly buckets = new Map<string, CapabilityBucket>();
  private readonly bufferSize: number;
  private readonly heuristics: HeuristicCheck[];

  constructor(opts: InMemoryCapabilityEvalRunnerOptions = {}) {
    this.bufferSize = opts.bufferSize ?? 200;
    this.heuristics =
      opts.heuristics ??
      defaultHeuristicSuite(
        opts.latencyTargetMs !== undefined
          ? ({ targetMs: opts.latencyTargetMs } satisfies LatencyBudgetCheckOptions)
          : undefined,
      );
  }

  recordInvocation(record: CapabilityInvocationRecord): void {
    let bucket = this.buckets.get(record.name);
    if (!bucket) {
      bucket = {
        name: record.name,
        kind: record.kind,
        invocations: [],
        checkResults: [],
        lastSeenAt: record.at,
      };
      this.buckets.set(record.name, bucket);
    }
    bucket.invocations.push(record);
    bucket.checkResults.push(this.heuristics.map((h) => h.evaluate(record)));
    bucket.lastSeenAt = record.at;
    // Evict oldest while over capacity. Cheap (≤1 splice per record in steady state).
    while (bucket.invocations.length > this.bufferSize) {
      bucket.invocations.shift();
      bucket.checkResults.shift();
    }
  }

  reportFor(name: string): CapabilityReport | null {
    const bucket = this.buckets.get(name);
    if (!bucket || bucket.invocations.length === 0) return null;
    return computeReport(bucket);
  }

  reportAll(): readonly CapabilityReport[] {
    const out: CapabilityReport[] = [];
    for (const bucket of this.buckets.values()) {
      if (bucket.invocations.length === 0) continue;
      out.push(computeReport(bucket));
    }
    // Sort by overallScore ascending (worst first — what the dashboard surfaces).
    out.sort((a, b) => (a.overallScore ?? 1) - (b.overallScore ?? 1));
    return out;
  }

  reset(): void {
    this.buckets.clear();
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.min(sorted.length - 1, Math.floor(p * sorted.length));
  return sorted[rank]!;
}

function computeReport(bucket: CapabilityBucket): CapabilityReport {
  const invocations = bucket.invocations;
  const total = invocations.length;
  const okCount = invocations.reduce((s, i) => s + (i.ok ? 1 : 0), 0);
  const durations = invocations.map((i) => i.durationMs).sort((a, b) => a - b);
  const median = percentile(durations, 0.5);
  const p95 = percentile(durations, 0.95);

  // Per-check mean across the buffer.
  const perCheckSums = new Map<string, { sum: number; count: number }>();
  for (const results of bucket.checkResults) {
    for (const r of results) {
      const acc = perCheckSums.get(r.checkName) ?? { sum: 0, count: 0 };
      acc.sum += r.score;
      acc.count += 1;
      perCheckSums.set(r.checkName, acc);
    }
  }
  const perCheck: Record<string, { mean: number; sampleSize: number }> = {};
  for (const [name, { sum, count }] of perCheckSums) {
    perCheck[name] = { mean: count === 0 ? 0 : sum / count, sampleSize: count };
  }
  const checkMeans = [...perCheckSums.values()].map((v) => (v.count === 0 ? 0 : v.sum / v.count));
  const overallScore =
    checkMeans.length === 0 ? null : checkMeans.reduce((s, m) => s + m, 0) / checkMeans.length;

  return {
    name: bucket.name,
    kind: bucket.kind,
    totalInvocations: total,
    okCount,
    failureCount: total - okCount,
    successRate: total === 0 ? 0 : okCount / total,
    medianLatencyMs: median,
    p95LatencyMs: p95,
    overallScore,
    perCheck,
    lastSeenAt: bucket.lastSeenAt,
  };
}
