/**
 * @saasagent/web-shell — embeddable Web Component agent shell.
 *
 * Per ADR-004 / ADR-005 / ADR-038 / ADR-022:
 *   - Renders the conversational pane (side-panel render mode at MVP).
 *   - LayoutRenderer walks ComposedLayouts emitted by the runtime.
 *   - RuntimeClient bridges SSE (planner stream) + WebSocket (interaction emit).
 *   - DOM observation (MO + IO + custom semantic events) lands in Phase 5.
 *
 * Status: Phase 1.2 — full transport-and-render loop wired. RuntimeClient connects
 * to the runtime; LayoutRenderer renders incoming layouts; user clicks emit
 * InstructionEnvelopes back over WebSocket.
 *
 * Usage:
 *   <saas-agent runtime="http://localhost:8080" mode="side-panel"></saas-agent>
 */

export const VERSION = '0.0.0';
export { LayoutRenderer, type RenderOptions } from './renderer.js';
export type { EmitTransport } from '@saasagent/protocol';
export {
  RuntimeClient,
  type RuntimeClientOptions,
  type EventSourceCtor,
  type WebSocketCtor,
} from './transport/index.js';
export { showErrorBanner, clearErrorBanner } from './error-banner.js';
export { InputBar, type InputBarOptions } from './input-bar.js';

import { LayoutRenderer } from './renderer.js';
import { RuntimeClient } from './transport/index.js';
import { showErrorBanner, clearErrorBanner } from './error-banner.js';
import { InputBar } from './input-bar.js';

/** Render modes per ADR-004 (side-panel only at MVP; others at v1+). */
export type RenderMode = 'side-panel' | 'full-page' | 'drawer' | 'eject';

export class SaaSAgentShell extends HTMLElement {
  private client: RuntimeClient | null = null;
  private renderer: LayoutRenderer | null = null;
  private inputBar: InputBar | null = null;
  private contentEl: HTMLDivElement | null = null;
  private errorAreaEl: HTMLDivElement | null = null;
  private inputAreaEl: HTMLDivElement | null = null;
  private lastComposeCycleId: string | null = null;
  private inputSequence = 0;

  static get observedAttributes(): string[] {
    return ['mode', 'runtime'];
  }

  connectedCallback(): void {
    this.renderShell();
    this.attachClient();
  }

  disconnectedCallback(): void {
    this.client?.disconnect();
    this.client = null;
    this.renderer = null;
    this.inputBar = null;
    this.contentEl = null;
    this.errorAreaEl = null;
    this.inputAreaEl = null;
  }

  attributeChangedCallback(name: string): void {
    if (name === 'mode' && this.contentEl) {
      this.contentEl.setAttribute('data-mode', this.getMode());
    }
    if (name === 'runtime') {
      this.client?.disconnect();
      this.attachClient();
    }
  }

  private getMode(): RenderMode {
    return (this.getAttribute('mode') as RenderMode | null) ?? 'side-panel';
  }

  private renderShell(): void {
    const mode = this.getMode();
    this.innerHTML = `
      <div data-saas-agent-shell="${mode}" style="font-family: system-ui; padding: 8px; border: 1px dashed #888; color: #555; display: flex; flex-direction: column; min-height: 320px;">
        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">SaaSAgent shell v${VERSION} — Phase 2.0 (mode: ${mode})</div>
        <div data-saas-agent-error-area></div>
        <div data-saas-agent-content data-mode="${mode}" style="flex: 1; min-height: 0;"></div>
        <div data-saas-agent-input-area></div>
      </div>
    `;
    this.contentEl = this.querySelector('[data-saas-agent-content]') as HTMLDivElement;
    this.errorAreaEl = this.querySelector('[data-saas-agent-error-area]') as HTMLDivElement;
    this.inputAreaEl = this.querySelector('[data-saas-agent-input-area]') as HTMLDivElement;
  }

  private attachClient(): void {
    const runtimeUrl = this.getAttribute('runtime');
    if (!runtimeUrl || !this.contentEl || !this.inputAreaEl) return;

    this.renderer = new LayoutRenderer({
      container: this.contentEl,
      transport: { send: (env) => this.client?.send(env) },
    });

    // Phase 2.0a: persistent text-input affordance. Sits BELOW the rendered layout
    // and lets the user drive the conversation even when the layout has no buttons.
    this.inputBar = new InputBar({
      transport: { send: (env) => this.client?.send(env) },
      getComposeCycleId: () => this.lastComposeCycleId,
      getSequence: () => this.inputSequence++,
    });
    this.inputAreaEl.appendChild(this.inputBar.element);

    this.client = new RuntimeClient({
      runtimeUrl,
      onLayout: (layout) => {
        // A successful layout supersedes any pending error display + re-enables input.
        if (this.errorAreaEl) clearErrorBanner(this.errorAreaEl);
        this.lastComposeCycleId = layout.composeCycleId;
        this.renderer?.render(layout);
        this.inputBar?.setBusy(false);
      },
      onServerError: (envelope) => {
        // Render visible error banner above the (possibly stale) layout, re-enable input.
        // Per Phase 1.4.3 design: error display is plain DOM, NOT composed from registered
        // atomic primitives — the failure path can't depend on the composer/registry being
        // healthy.
        // eslint-disable-next-line no-console
        console.error(
          `[saas-agent shell] server error (${envelope.category}/${envelope.code}, retryable=${envelope.retryable}):`,
          envelope.message,
        );
        if (this.errorAreaEl) showErrorBanner(this.errorAreaEl, envelope);
        this.inputBar?.setBusy(false);
      },
      onError: (err) => {
        // eslint-disable-next-line no-console
        console.error('[saas-agent shell] transport error:', err);
        this.inputBar?.setBusy(false);
      },
    });
    this.client.connect();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('saas-agent')) {
  customElements.define('saas-agent', SaaSAgentShell);
}
