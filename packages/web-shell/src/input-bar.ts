/**
 * Input bar — permanent text-input affordance at the bottom of the shell.
 *
 * Per Phase 2.0a (see docs/architecture/phase-1.4-review.md): the shell needs
 * a way for the user to drive the conversation that doesn't depend on the
 * current composed layout including a button. A persistent text input that
 * emits `InstructionEnvelope { type: "user-message", payload: { text } }`
 * over WebSocket is the minimum viable affordance.
 *
 * Plain DOM, inline-styled, framework-agnostic. Submit on Enter (Shift+Enter
 * for newline). Disabled while a previous message is in flight (caller toggles
 * via `setBusy`).
 */

import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';

export interface InputBarOptions {
  /** Where to emit user-message envelopes. */
  transport: EmitTransport;
  /**
   * Last known compose-cycle id from a server-emitted layout. Carried back into
   * each user-message envelope so the runtime can correlate the user's reply
   * with the layout it was responding to.
   */
  getComposeCycleId: () => string | null;
  /**
   * Sequence-number generator scoped to (composeCycleId, sourceNodeId). The
   * input bar uses sourceNodeId="user-input" so it shares its sequence space
   * with itself, separate from the LayoutRenderer's emit sequence.
   */
  getSequence: () => number;
}

const SOURCE_NODE_ID = 'user-input';

export class InputBar {
  readonly element: HTMLElement;
  private readonly textarea: HTMLTextAreaElement;
  private readonly sendBtn: HTMLButtonElement;
  private busy = false;

  constructor(private readonly options: InputBarOptions) {
    this.element = document.createElement('div');
    this.element.setAttribute('data-saas-agent-input-bar', '');
    this.element.style.cssText = [
      'display: flex',
      'gap: 6px',
      'align-items: flex-end',
      'border-top: 1px solid #e5e7eb',
      'padding: 8px 0 0 0',
      'margin-top: 12px',
    ].join('; ');

    this.textarea = document.createElement('textarea');
    this.textarea.setAttribute('data-saas-agent-input', '');
    this.textarea.placeholder = 'Type a message…';
    this.textarea.rows = 1;
    this.textarea.style.cssText = [
      'flex: 1',
      'resize: none',
      'border: 1px solid #d1d5db',
      'border-radius: 6px',
      'padding: 8px 10px',
      'font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      'min-height: 36px',
      'max-height: 160px',
      'outline: none',
    ].join('; ');
    this.textarea.addEventListener('input', () => this.autoSize());
    this.textarea.addEventListener('keydown', (e) => this.handleKey(e));

    this.sendBtn = document.createElement('button');
    this.sendBtn.setAttribute('data-saas-agent-input-send', '');
    this.sendBtn.type = 'button';
    this.sendBtn.textContent = 'Send';
    this.sendBtn.style.cssText = [
      'padding: 8px 14px',
      'border: 1px solid #2563eb',
      'background: #2563eb',
      'color: white',
      'border-radius: 6px',
      'cursor: pointer',
      'font: 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
      'min-height: 36px',
    ].join('; ');
    this.sendBtn.addEventListener('click', () => this.submit());

    this.element.appendChild(this.textarea);
    this.element.appendChild(this.sendBtn);
  }

  /** Disable input + button while a request is in flight. */
  setBusy(busy: boolean): void {
    this.busy = busy;
    this.textarea.disabled = busy;
    this.sendBtn.disabled = busy;
    this.sendBtn.style.opacity = busy ? '0.5' : '1';
    this.sendBtn.style.cursor = busy ? 'wait' : 'pointer';
  }

  /** Programmatically focus the input (for tests and keyboard UX). */
  focus(): void {
    this.textarea.focus();
  }

  private handleKey(e: KeyboardEvent): void {
    // Enter submits; Shift+Enter inserts a newline.
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      this.submit();
    }
  }

  private autoSize(): void {
    // Reset then grow up to max-height to match content.
    this.textarea.style.height = 'auto';
    this.textarea.style.height = `${Math.min(this.textarea.scrollHeight, 160)}px`;
  }

  private submit(): void {
    if (this.busy) return;
    const text = this.textarea.value.trim();
    if (text.length === 0) return;

    const envelope: InstructionEnvelope = {
      composeCycleId: this.options.getComposeCycleId() ?? 'no-cycle',
      sourceNodeId: SOURCE_NODE_ID,
      emittedAt: new Date().toISOString(),
      type: 'user-message',
      payload: { text },
      sequence: this.options.getSequence(),
    };
    void this.options.transport.send(envelope);

    this.textarea.value = '';
    this.autoSize();
  }
}
