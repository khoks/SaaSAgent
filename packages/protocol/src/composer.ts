/**
 * UI Composer interface — per ADR-005, ADR-012.
 *
 * The Composer takes a planner-produced intent + context and emits a typed-JSON
 * {@link ComposedLayout} that the shell renders. Default: Haiku composer with
 * cached layout templates per canonical intent + Sonnet fallback for novel intents.
 *
 * The planner and composer are separate concerns: planner decides WHAT to do
 * (which skills/tools/sub-agents to call); composer decides HOW to render the
 * resulting state in the shell using the host's atomic primitives.
 */

import type { AtomicComponentRegistry } from './atomic-component.js';
import type { ComposedLayout } from './layout.js';
import type { ThemeRegistration } from './theme.js';

/** Inputs available to the Composer at compose time. */
export interface ComposeContext {
  /** The host's atomic components registry. */
  components: AtomicComponentRegistry;
  /** The active theme. */
  theme: ThemeRegistration;
  /** Conversation context — recent turns, planner state, recalled memory. */
  conversationContext: ConversationContext;
  /** Feature/Service hints from the relevant `.feature.md` document, if any. */
  featureHints?: ReadonlyArray<string>;
  /** Mobile-context hints (per ADR-017). */
  mobileContext?: MobileContext;
  /** Previous composed layout in this turn, if this is a re-render after instruction emit. */
  previousLayout?: ComposedLayout;
  /**
   * Skill / Tool invocations the planner performed before this compose call
   * (Phase 2.1c). The composer should render against the actual fetched data
   * when present — e.g. format `output` into a Card / List rather than asking
   * the user to wait. Empty / undefined for passthrough plans (no tool use).
   */
  toolResults?: ReadonlyArray<ComposedToolInvocation>;
}

/**
 * Wire-safe summary of a planner-side Skill/Tool invocation. The planner's
 * internal ToolInvocation carries an Error-instance `cause`; this trimmed shape
 * is what the composer (and any future serializer) sees.
 */
export interface ComposedToolInvocation {
  /** Capability name (without skill__/tool__ prefix). */
  name: string;
  /** Which executor handled the call. */
  kind: 'skill' | 'tool';
  /** Input args passed to the executor. */
  input: unknown;
  /** True if the executor returned ok. */
  ok: boolean;
  /** Output value when ok=true. */
  output?: unknown;
  /** Error summary when ok=false. */
  error?: { code: string; message: string; status?: number };
  /** Wall-clock duration of the executor call in milliseconds. */
  durationMs: number;
}

export interface ConversationContext {
  /** A short summary of the user intent the planner is solving for. */
  intent: string;
  /** User-facing text the planner is producing alongside the UI (if any). */
  narrative?: string;
  /** Recent conversation turns (user + agent). */
  recentTurns?: ReadonlyArray<ConversationTurn>;
  /** Memory recall results referenced by the planner. */
  memoryRecall?: ReadonlyArray<MemoryRecall>;
}

export interface ConversationTurn {
  speaker: 'user' | 'agent';
  text: string;
  /** ISO-8601. */
  at: string;
}

export interface MemoryRecall {
  store: 'postgres' | 'qdrant' | 'clickhouse' | 'neo4j';
  /** Free-form summary the planner consumed. */
  summary: string;
}

export interface MobileContext {
  /** Detected device class. */
  deviceClass: 'mobile' | 'tablet' | 'desktop';
  /** Viewport width in CSS pixels. */
  viewportWidth: number;
  /** Touch vs. pointer input. */
  inputMode: 'touch' | 'pointer' | 'hybrid';
  /** Effective network class. */
  networkClass?: '4g' | '3g' | '2g' | 'slow-2g' | 'wifi';
}

/** The Composer interface implementations satisfy. */
export interface UIComposer {
  compose(intent: string, context: ComposeContext): Promise<ComposedLayout>;
}
