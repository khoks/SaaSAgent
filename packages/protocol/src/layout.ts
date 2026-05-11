/**
 * Typed-JSON layout tree — the output of the UI Composer (per ADR-005, ADR-013).
 *
 * The composer emits a {@link LayoutTree} that references atomic UI components from
 * the host's design system registry. The shell renders the tree by mounting those
 * components, applying theme tokens, wiring data, and subscribing to interaction
 * events. Each interaction event emits an {@link InstructionEnvelope} back to the
 * runtime, which re-plans and emits the next LayoutTree.
 *
 * Wire format per ADR-038:
 *   composer ── LayoutTree (over SSE) ──→ shell
 *   shell ── InstructionEnvelope (over WebSocket) ──→ runtime
 */

import type { ThemeOverride } from './theme.js';

/** A node in the composed layout tree. */
export interface LayoutNode {
  /** Stable id within this composition cycle (used for instruction-emit causality + re-render diffing). */
  id: string;
  /** Reference to a registered atomic UI component in the host's design system. */
  component: string;
  /** Component props, validated against the component's registered propsSchema. */
  props?: Readonly<Record<string, unknown>>;
  /** Data wiring spec — describes where each prop value comes from at render time. */
  dataWiring?: Readonly<Record<string, DataSource>>;
  /** Children layout nodes (default slot composition). */
  children?: ReadonlyArray<LayoutNode>;
  /** Named slot contents (for components that declare named slots). */
  slots?: Readonly<Record<string, ReadonlyArray<LayoutNode>>>;
  /** Interaction emits — what InstructionEnvelope to emit on which DOM event. */
  emits?: Readonly<Record<string, EmitSpec>>;
  /** Local theme-token overrides applied to this subtree. */
  theme?: ThemeOverride;
}

/** Where the value of a prop (or slot child) comes from at render time. */
export type DataSource =
  | { kind: 'literal'; value: unknown }
  | { kind: 'memory'; query: MemoryQuery }
  | { kind: 'host-api'; toolId: string; args?: Readonly<Record<string, unknown>> }
  | { kind: 'sub-agent'; subAgentId: string; args?: Readonly<Record<string, unknown>> }
  | { kind: 'computed'; expression: string };

/** A query against the platform's memory layer (per docs/architecture/memory.md). */
export interface MemoryQuery {
  /** Which store to query. */
  store: 'postgres' | 'qdrant' | 'clickhouse' | 'neo4j';
  /** Store-specific query payload. */
  payload: Readonly<Record<string, unknown>>;
}

/** What InstructionEnvelope to emit when a DOM event fires on this node. */
export interface EmitSpec {
  /** Instruction type — semantic action label the planner reasons about. */
  type: string;
  /** Static payload merged with runtime event data at emit time. */
  payload?: Readonly<Record<string, unknown>>;
  /** Whether to debounce identical emits (protect against double-clicks etc.). */
  debounceMs?: number;
}

/** A complete composed layout, the unit a Composer emits and the shell renders. */
export interface ComposedLayout {
  /** Causality token — every InstructionEnvelope from this layout carries it. */
  composeCycleId: string;
  /** Wall-clock time of composition (ISO-8601). */
  composedAt: string;
  /** Root of the layout tree. */
  root: LayoutNode;
  /** Optional metadata for caching, analytics, eval. */
  metadata?: ComposedLayoutMetadata;
}

export interface ComposedLayoutMetadata {
  /** Canonical intent label — used for cached-template lookup (ADR-012). */
  intent?: string;
  /** Skills / sub-agents / tools the planner used producing this. */
  sources?: ReadonlyArray<string>;
  /** Model used (planner / composer). */
  modelUsed?: { planner?: string; composer?: string };
  /** Whether this layout came from cache (hit) or full composition (miss). */
  fromCache?: boolean;
  /**
   * End-user quota status at compose time (Phase 7 / ADR-019). When the host
   * configures a TierProvider, the runtime attaches the consuming user's
   * tier + remaining-requests state here so the shell can render a visible
   * "X requests remaining" affordance. Null/undefined when no provider is
   * configured (open-source / unlimited mode).
   */
  quotaStatus?: QuotaStatus;
}

/**
 * Per-user quota snapshot delivered alongside a layout (Phase 7).
 * Mirrors the runtime's QuotaCheckResult but lives in the protocol package
 * so the shell can render it without a runtime import. `limit` and `remaining`
 * are `null` for unlimited tiers (Infinity does not survive JSON.stringify).
 */
export interface QuotaStatus {
  /** True when the latest user-message was allowed; false when this layout
   * is the quota-exceeded rejection notice. */
  allowed: boolean;
  /** Tier id ('free' / 'pro' / etc.). */
  tier: string;
  /** Requests consumed in the current window. */
  used: number;
  /** Hard cap. Null means unlimited. */
  limit: number | null;
  /** Requests remaining in the window. Null = unlimited. */
  remaining: number | null;
  /** ISO-8601 timestamp of the next window reset. */
  resetAtUtc: string;
  /** Populated when allowed=false. Stable codes downstream UIs can switch on. */
  reason?: 'quota-exceeded' | 'tier-not-found' | 'provider-error';
}
