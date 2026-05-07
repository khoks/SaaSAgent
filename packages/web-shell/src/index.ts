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
export { FeedbackBar, type FeedbackBarOptions } from './feedback-bar.js';
export { detectMobileContext, watchMobileContext } from './mobile-context.js';
export { styleFor, openEjectedWindow } from './render-modes.js';
export type { RenderMode } from './render-modes-types.js';
export { DomObserver, type DomObserverOptions } from './dom-observer.js';

import { LayoutRenderer } from './renderer.js';
import { RuntimeClient } from './transport/index.js';
import { showErrorBanner, clearErrorBanner } from './error-banner.js';
import { InputBar } from './input-bar.js';
import { FeedbackBar } from './feedback-bar.js';
import { detectMobileContext, watchMobileContext } from './mobile-context.js';
import { styleFor, openEjectedWindow } from './render-modes.js';
import type { RenderMode } from './render-modes-types.js';
import { DomObserver } from './dom-observer.js';

import type { InstructionEnvelope } from '@saasagent/protocol';

export class SaaSAgentShell extends HTMLElement {
  private client: RuntimeClient | null = null;
  private renderer: LayoutRenderer | null = null;
  private inputBar: InputBar | null = null;
  private feedbackBar: FeedbackBar | null = null;
  private contentEl: HTMLDivElement | null = null;
  private errorAreaEl: HTMLDivElement | null = null;
  private inputAreaEl: HTMLDivElement | null = null;
  private feedbackAreaEl: HTMLDivElement | null = null;
  private lastComposeCycleId: string | null = null;
  private inputSequence = 0;
  private feedbackSequence = 0;
  private mobileSequence = 0;
  private mobileWatchDispose: (() => void) | null = null;
  private ejectedWindow: Window | null = null;
  private domObserver: DomObserver | null = null;
  private domSequence = 0;

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
    this.feedbackBar = null;
    this.contentEl = null;
    this.errorAreaEl = null;
    this.inputAreaEl = null;
    this.feedbackAreaEl = null;
    this.mobileWatchDispose?.();
    this.mobileWatchDispose = null;
    try {
      this.ejectedWindow?.close();
    } catch {
      /* ignore */
    }
    this.ejectedWindow = null;
    this.domObserver?.stop();
    this.domObserver = null;
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
    // Phase 5 (ADR-004): eject mode opens a popped-out window and renders an
    // in-page placeholder pointing the user there. Other modes render inline
    // with mode-specific styling from styleFor().
    if (mode === 'eject') {
      this.renderEjectPlaceholder();
      return;
    }
    const style = styleFor(mode);
    this.innerHTML = `
      <div data-saas-agent-shell="${mode}" style="${style}">
        <div style="font-size: 12px; color: #999; margin-bottom: 4px;">SaaSAgent shell v${VERSION} — Phase 5 (mode: ${mode})</div>
        <div data-saas-agent-error-area></div>
        <div data-saas-agent-content data-mode="${mode}" style="flex: 1; min-height: 0;"></div>
        <div data-saas-agent-feedback-area></div>
        <div data-saas-agent-input-area></div>
      </div>
    `;
    this.contentEl = this.querySelector('[data-saas-agent-content]') as HTMLDivElement;
    this.errorAreaEl = this.querySelector('[data-saas-agent-error-area]') as HTMLDivElement;
    this.feedbackAreaEl = this.querySelector('[data-saas-agent-feedback-area]') as HTMLDivElement;
    this.inputAreaEl = this.querySelector('[data-saas-agent-input-area]') as HTMLDivElement;
  }

  /**
   * For mode='eject': render a thin placeholder + open the popped-out window.
   * If popup is blocked, render an explanatory message + a re-try button.
   */
  private renderEjectPlaceholder(): void {
    const style = styleFor('eject');
    const runtimeUrl = this.getAttribute('runtime') ?? '';
    this.innerHTML = `
      <div data-saas-agent-shell="eject" style="${style}">
        <div style="font-size: 13px;">SaaSAgent v${VERSION} — ejected mode</div>
        <div data-saas-agent-eject-status style="font-size: 12px; color: #6b7280; margin-top: 4px;">
          Opening agent window…
        </div>
        <button data-saas-agent-eject-reopen style="margin-top: 8px; padding: 6px 10px; border: 1px solid #2563eb; background: #2563eb; color: white; border-radius: 4px; cursor: pointer; font-size: 12px;">
          Open agent window
        </button>
      </div>
    `;
    const statusEl = this.querySelector('[data-saas-agent-eject-status]') as HTMLDivElement;
    const reopenBtn = this.querySelector('[data-saas-agent-eject-reopen]') as HTMLButtonElement;
    const tryOpen = (): void => {
      this.ejectedWindow?.close();
      this.ejectedWindow = openEjectedWindow(runtimeUrl);
      if (this.ejectedWindow) {
        statusEl.textContent = 'Agent is open in a separate window.';
      } else {
        statusEl.textContent = 'Popup blocked — click below to allow.';
      }
    };
    reopenBtn.addEventListener('click', tryOpen);
    tryOpen();
  }

  private attachClient(): void {
    const runtimeUrl = this.getAttribute('runtime');
    // In eject mode the popup window owns the connection — the in-page
    // placeholder doesn't connect.
    if (this.getMode() === 'eject') return;
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

    // Phase 2.5.x: thumbs-up/down feedback widget for the most recent layout.
    // Emits eval-feedback envelopes the runtime intercepts BEFORE the planner.
    if (this.feedbackAreaEl) {
      this.feedbackBar = new FeedbackBar({
        transport: { send: (env) => this.client?.send(env) },
        getComposeCycleId: () => this.lastComposeCycleId,
        getSequence: () => this.feedbackSequence++,
      });
      this.feedbackAreaEl.appendChild(this.feedbackBar.element);
    }

    // Phase 5 (ADR-017): emit a mobile-context envelope on connect + on
    // viewport changes. Runtime stashes on per-WS state and threads into
    // ComposeContext.mobileContext on subsequent plans.
    const sendMobileContext = (): void => {
      if (typeof window === 'undefined') return;
      const ctx = detectMobileContext();
      const env: InstructionEnvelope = {
        composeCycleId: this.lastComposeCycleId ?? 'no-cycle',
        sourceNodeId: 'mobile-context',
        emittedAt: new Date().toISOString(),
        type: 'mobile-context',
        sequence: this.mobileSequence++,
        payload: ctx as unknown as Readonly<Record<string, unknown>>,
      };
      this.client?.send(env);
    };

    this.client = new RuntimeClient({
      runtimeUrl,
      onLayout: (layout) => {
        // A successful layout supersedes any pending error display + re-enables input.
        if (this.errorAreaEl) clearErrorBanner(this.errorAreaEl);
        this.lastComposeCycleId = layout.composeCycleId;
        this.renderer?.render(layout);
        this.inputBar?.setBusy(false);
        this.feedbackBar?.resetForNewCycle(layout.composeCycleId);
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

    // Send mobile-context once the WS is ready (small delay so connect lands first),
    // and start watching for resize / orientationchange / network changes.
    if (typeof window !== 'undefined') {
      setTimeout(sendMobileContext, 250);
      this.mobileWatchDispose = watchMobileContext(() => sendMobileContext());
    }

    // Phase 5 (ADR-022): start DOM observation. Watches data-saas-agent-observe
    // regions for mutations, data-saas-agent-track-viewport elements for
    // visibility, and document-level saasagent:event custom events.
    if (typeof document !== 'undefined') {
      this.domObserver = new DomObserver({
        transport: { send: (env) => this.client?.send(env) },
        getComposeCycleId: () => this.lastComposeCycleId,
        getSequence: () => this.domSequence++,
      }).start();
    }
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('saas-agent')) {
  customElements.define('saas-agent', SaaSAgentShell);
}
