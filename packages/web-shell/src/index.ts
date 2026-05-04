/**
 * @saasagent/web-shell — embeddable Web Component agent shell.
 *
 * Per ADR-004 / ADR-005 / ADR-038: the host embeds <saas-agent /> in their web app.
 * The shell:
 *   - Renders the conversational pane (side-panel render mode at MVP).
 *   - Hosts the LayoutRenderer that walks ComposedLayouts emitted by the runtime.
 *   - Subscribes to DOM observation events (MO + IO + custom semantic events per ADR-022).
 *   - Bridges typed-JSON instruction emit ↔ runtime over SSE (planner stream) +
 *     WebSocket (interaction emit) (per ADR-038).
 *
 * Status: Phase 1.1 — LayoutRenderer + custom element wired; real SSE/WS transport
 * lands in Phase 1.2.
 */

export const VERSION = '0.0.0';
export { LayoutRenderer, type EmitTransport, type RenderOptions } from './renderer.js';

/** Render modes per ADR-004 (side-panel only at MVP; others at v1+). */
export type RenderMode = 'side-panel' | 'full-page' | 'drawer' | 'eject';

export class SaaSAgentShell extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['mode', 'runtime'];
  }

  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    this.render();
  }

  private render(): void {
    const mode = (this.getAttribute('mode') as RenderMode | null) ?? 'side-panel';
    this.innerHTML = `
      <div data-saas-agent-shell="${mode}" style="font-family: system-ui; padding: 8px; border: 1px dashed #888; color: #555;">
        SaaSAgent shell v${VERSION} — Phase 1.1 scaffold (mode: ${mode}). LayoutRenderer ready; SSE/WS transport in Phase 1.2.
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('saas-agent')) {
  customElements.define('saas-agent', SaaSAgentShell);
}
