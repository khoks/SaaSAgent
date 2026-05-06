/**
 * Feedback bar — thumbs up/down + optional comment for the most recent layout.
 *
 * Phase 2.5.x — completes the eval loop end-to-end. The runtime captures
 * eval-feedback envelopes via the WS intercept added in Phase 2.5; this
 * widget produces them.
 *
 * Plain DOM, inline-styled, framework-agnostic. The widget reads the most
 * recent composeCycleId from a getter (provided by the shell) so it scores
 * the layout the user is currently looking at, not whatever layout was
 * displayed when the widget was constructed.
 *
 * Wire format emitted on click:
 *   { type: 'eval-feedback',
 *     payload: { signal: 'positive'|'negative', source: 'user-explicit', comment? },
 *     composeCycleId: <current>,
 *     sourceNodeId: 'feedback-bar' }
 *
 * Per Phase 2.5: runtime intercepts type='eval-feedback' BEFORE the planner
 * and routes to the EvalProvider. No re-compose is triggered — feedback is
 * out-of-band by design, so the user can score the current layout without
 * losing their place in the conversation.
 */

import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';

const SOURCE_NODE_ID = 'feedback-bar';

export interface FeedbackBarOptions {
  /** Where to emit eval-feedback envelopes (same WS as InputBar). */
  transport: EmitTransport;
  /** Last known compose-cycle id. The widget refuses to emit when this is null. */
  getComposeCycleId: () => string | null;
  /** Sequence-number generator (separate from InputBar's space). */
  getSequence: () => number;
}

export class FeedbackBar {
  readonly element: HTMLElement;
  private readonly upBtn: HTMLButtonElement;
  private readonly downBtn: HTMLButtonElement;
  private readonly statusEl: HTMLSpanElement;
  /** composeCycleId we already submitted feedback for, to discourage spamming. */
  private lastSubmittedCycleId: string | null = null;

  constructor(private readonly options: FeedbackBarOptions) {
    this.element = document.createElement('div');
    this.element.setAttribute('data-saas-agent-feedback-bar', '');
    this.element.style.cssText = [
      'display: flex',
      'gap: 6px',
      'align-items: center',
      'padding: 4px 0',
      'font: 11px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      'color: #6b7280',
    ].join('; ');

    const label = document.createElement('span');
    label.textContent = 'Was this helpful?';
    label.style.cssText = 'margin-right: 4px;';
    this.element.appendChild(label);

    this.upBtn = this.makeBtn('thumbs-up', '👍');
    this.upBtn.addEventListener('click', () => this.emit('positive'));
    this.element.appendChild(this.upBtn);

    this.downBtn = this.makeBtn('thumbs-down', '👎');
    this.downBtn.addEventListener('click', () => this.emit('negative'));
    this.element.appendChild(this.downBtn);

    this.statusEl = document.createElement('span');
    this.statusEl.setAttribute('data-saas-agent-feedback-status', '');
    this.statusEl.style.cssText = 'margin-left: 6px; color: #9ca3af;';
    this.element.appendChild(this.statusEl);
  }

  /** Reset the "thanks" status when a fresh layout arrives. */
  resetForNewCycle(cycleId: string): void {
    if (cycleId !== this.lastSubmittedCycleId) {
      this.statusEl.textContent = '';
      this.upBtn.disabled = false;
      this.downBtn.disabled = false;
      this.upBtn.style.opacity = '1';
      this.downBtn.style.opacity = '1';
    }
  }

  private makeBtn(nodeId: string, text: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.setAttribute('data-saas-agent-feedback', nodeId);
    btn.type = 'button';
    btn.textContent = text;
    btn.style.cssText = [
      'padding: 2px 8px',
      'border: 1px solid #d1d5db',
      'background: white',
      'border-radius: 4px',
      'cursor: pointer',
      'font-size: 14px',
      'line-height: 1',
    ].join('; ');
    return btn;
  }

  private emit(signal: 'positive' | 'negative'): void {
    const cycleId = this.options.getComposeCycleId();
    if (!cycleId) return; // Nothing to score yet.
    if (cycleId === this.lastSubmittedCycleId) return; // Already scored this layout.

    const envelope: InstructionEnvelope = {
      composeCycleId: cycleId,
      sourceNodeId: SOURCE_NODE_ID,
      emittedAt: new Date().toISOString(),
      type: 'eval-feedback',
      payload: { signal, source: 'user-explicit' },
      sequence: this.options.getSequence(),
    };
    void this.options.transport.send(envelope);

    this.lastSubmittedCycleId = cycleId;
    this.statusEl.textContent = signal === 'positive' ? 'Thanks!' : 'Got it — we\'ll improve.';
    this.upBtn.disabled = true;
    this.downBtn.disabled = true;
    this.upBtn.style.opacity = signal === 'positive' ? '1' : '0.4';
    this.downBtn.style.opacity = signal === 'negative' ? '1' : '0.4';
  }
}
