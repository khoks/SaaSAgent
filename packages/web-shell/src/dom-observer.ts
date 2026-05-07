/**
 * DOM observation — Phase 5 (ADR-022).
 *
 * Three signal sources turn the agent ambient-aware of what the user is doing
 * on the host page WITHOUT requiring explicit instructions:
 *
 *   1. MutationObserver — watches `[data-saas-agent-observe]` annotated regions
 *      of the host DOM for content changes. Element added / removed / mutated
 *      → emit `dom-mutation` envelope.
 *
 *   2. IntersectionObserver — watches `[data-saas-agent-track-viewport]`
 *      elements. Crossing the viewport threshold (default 50% visible for 1s)
 *      → emit `dom-visibility` envelope. Useful for "user dwelled on the
 *      checkout summary" signals.
 *
 *   3. Custom semantic events — host pages dispatch `saasagent:event` with
 *      a structured detail and the observer relays them as `dom-semantic`
 *      envelopes. This is the canonical hook for explicit host signals
 *      (e.g. `checkout-step-2-completed`).
 *
 * All three are throttled (200ms default for MO, 1s default for IO) and
 * payload-bounded (max 1KB per emission, configurable) to prevent the agent
 * from being overwhelmed by chatty pages.
 *
 * The runtime intercepts these envelope types BEFORE the planner (like
 * eval-feedback / mobile-context) and stashes them in a per-WS DOM signal
 * buffer that the SonnetPlanner can read on the next plan() — so the agent
 * gets ambient awareness without re-composing on every mouse-move.
 *
 * No host-page modifications required for #3 — the host just dispatches the
 * `saasagent:event` event:
 *
 *   document.dispatchEvent(new CustomEvent('saasagent:event', {
 *     detail: { kind: 'cart-updated', payload: { itemCount: 3, total: 99.97 } }
 *   }));
 */

import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';

export interface DomObserverOptions {
  transport: EmitTransport;
  getComposeCycleId: () => string | null;
  getSequence: () => number;
  /** Root element to observe. Default `document.body`. */
  root?: Element;
  /** Mutation throttle window in ms. Default 200. */
  mutationThrottleMs?: number;
  /** Intersection threshold in [0, 1]. Default 0.5 (50% visible). */
  intersectionThreshold?: number;
  /** Sustained-visibility window before firing dom-visibility. Default 1000ms. */
  intersectionDwellMs?: number;
  /** Max bytes for any single emission's payload (truncated as JSON). Default 1024. */
  maxPayloadBytes?: number;
}

const SOURCE_NODE_ID = 'dom-observer';

interface DomMutationPayload {
  /** Selector identifying the mutated region (uses data-saas-agent-observe value). */
  region: string;
  /** Mutation kind summary. */
  kind: 'added' | 'removed' | 'attributes' | 'characterData';
  /** Number of mutations batched into this emission. */
  count: number;
  /** Snapshot of the region's textContent (truncated to maxPayloadBytes). */
  textSnapshot?: string;
}

interface DomVisibilityPayload {
  region: string;
  visible: boolean;
  /** How long the element was visible before this emission, in ms. */
  dwellMs: number;
}

interface DomSemanticPayload {
  kind: string;
  payload: unknown;
}

/**
 * Wires up MO + IO + custom-event listeners on the host page. Returns a
 * disposer that detaches everything.
 */
export class DomObserver {
  private mo: MutationObserver | null = null;
  private io: IntersectionObserver | null = null;
  private semanticHandler: ((e: Event) => void) | null = null;
  private mutationBuffer: MutationRecord[] = [];
  private mutationTimer: ReturnType<typeof setTimeout> | null = null;
  private dwellTimers = new Map<Element, ReturnType<typeof setTimeout>>();
  private visibleSince = new Map<Element, number>();
  private readonly maxPayloadBytes: number;
  private readonly mutationThrottleMs: number;

  constructor(private readonly options: DomObserverOptions) {
    this.maxPayloadBytes = options.maxPayloadBytes ?? 1024;
    this.mutationThrottleMs = options.mutationThrottleMs ?? 200;
  }

  /** Begin observing. Returns this for chaining. */
  start(): this {
    if (typeof window === 'undefined' || typeof document === 'undefined') return this;
    this.startMutation();
    this.startIntersection();
    this.startSemantic();
    return this;
  }

  /** Detach everything. */
  stop(): void {
    this.mo?.disconnect();
    this.mo = null;
    this.io?.disconnect();
    this.io = null;
    if (this.semanticHandler) {
      document.removeEventListener('saasagent:event', this.semanticHandler);
      this.semanticHandler = null;
    }
    if (this.mutationTimer) clearTimeout(this.mutationTimer);
    this.mutationTimer = null;
    this.mutationBuffer = [];
    for (const t of this.dwellTimers.values()) clearTimeout(t);
    this.dwellTimers.clear();
    this.visibleSince.clear();
  }

  private startMutation(): void {
    const root = this.options.root ?? document.body;
    if (!root) return;
    this.mo = new MutationObserver((records) => {
      this.mutationBuffer.push(...records);
      if (this.mutationTimer) return;
      this.mutationTimer = setTimeout(() => this.flushMutations(), this.mutationThrottleMs);
    });
    // Observe the entire subtree but downstream filtering keeps emissions to
    // annotated regions only.
    this.mo.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }

  private flushMutations(): void {
    this.mutationTimer = null;
    const records = this.mutationBuffer;
    this.mutationBuffer = [];
    if (records.length === 0) return;

    // Group by closest [data-saas-agent-observe] ancestor.
    const byRegion = new Map<string, { kind: DomMutationPayload['kind']; count: number; el: Element | null }>();
    for (const rec of records) {
      const target = (rec.target as Node).nodeType === 1 ? (rec.target as Element) : (rec.target.parentElement as Element | null);
      if (!target) continue;
      const region = target.closest?.('[data-saas-agent-observe]') as Element | null;
      if (!region) continue;
      const regionId = region.getAttribute('data-saas-agent-observe') ?? 'unknown';
      const kind: DomMutationPayload['kind'] =
        rec.type === 'childList'
          ? rec.addedNodes.length > 0
            ? 'added'
            : 'removed'
          : rec.type === 'attributes'
            ? 'attributes'
            : 'characterData';
      const cur = byRegion.get(regionId) ?? { kind, count: 0, el: region };
      cur.count += 1;
      // Prefer 'added' / 'removed' over attribute mutations for the kind label.
      if (cur.kind === 'attributes' && (kind === 'added' || kind === 'removed')) cur.kind = kind;
      byRegion.set(regionId, cur);
    }

    for (const [region, info] of byRegion.entries()) {
      const text = info.el?.textContent ?? '';
      const payload: DomMutationPayload = {
        region,
        kind: info.kind,
        count: info.count,
        ...(text ? { textSnapshot: this.truncate(text) } : {}),
      };
      this.emit('dom-mutation', payload as unknown as Record<string, unknown>);
    }
  }

  private startIntersection(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    const threshold = this.options.intersectionThreshold ?? 0.5;
    const dwell = this.options.intersectionDwellMs ?? 1000;
    this.io = new IntersectionObserver(
      (entries) => {
        const now = Date.now();
        for (const entry of entries) {
          const el = entry.target;
          if (entry.isIntersecting) {
            this.visibleSince.set(el, now);
            // Schedule a dwell-fire if not already scheduled.
            if (!this.dwellTimers.has(el)) {
              const t = setTimeout(() => this.fireVisibility(el, true), dwell);
              this.dwellTimers.set(el, t);
            }
          } else {
            // Element left the viewport before dwell fired → cancel timer.
            const t = this.dwellTimers.get(el);
            if (t) {
              clearTimeout(t);
              this.dwellTimers.delete(el);
            }
            // If already fired (visibleSince still set + we'd previously emitted),
            // emit a 'left viewport' signal too.
            if (this.visibleSince.has(el)) {
              this.fireVisibility(el, false);
            }
          }
        }
      },
      { threshold },
    );

    // Pick up all currently-tagged elements.
    document.querySelectorAll('[data-saas-agent-track-viewport]').forEach((el) => {
      this.io?.observe(el);
    });
  }

  private fireVisibility(el: Element, visible: boolean): void {
    const since = this.visibleSince.get(el) ?? Date.now();
    const dwellMs = Date.now() - since;
    const region = el.getAttribute('data-saas-agent-track-viewport') ?? 'unknown';
    const payload: DomVisibilityPayload = { region, visible, dwellMs };
    this.emit('dom-visibility', payload as unknown as Record<string, unknown>);
    this.dwellTimers.delete(el);
    if (!visible) this.visibleSince.delete(el);
  }

  private startSemantic(): void {
    this.semanticHandler = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { kind?: string; payload?: unknown } | undefined;
      if (!detail || typeof detail.kind !== 'string') return;
      const payload: DomSemanticPayload = { kind: detail.kind, payload: detail.payload ?? null };
      this.emit('dom-semantic', payload as unknown as Record<string, unknown>);
    };
    document.addEventListener('saasagent:event', this.semanticHandler);
  }

  private emit(type: 'dom-mutation' | 'dom-visibility' | 'dom-semantic', payload: Record<string, unknown>): void {
    const env: InstructionEnvelope = {
      composeCycleId: this.options.getComposeCycleId() ?? 'no-cycle',
      sourceNodeId: SOURCE_NODE_ID,
      emittedAt: new Date().toISOString(),
      type,
      sequence: this.options.getSequence(),
      payload,
    };
    void this.options.transport.send(env);
  }

  private truncate(s: string): string {
    if (s.length <= this.maxPayloadBytes) return s;
    return s.slice(0, this.maxPayloadBytes - 1) + '…';
  }
}
