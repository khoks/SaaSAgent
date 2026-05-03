/**
 * @saasagent/web-shell — embeddable Web Component agent shell.
 *
 * Per ADR-004 / ADR-005: the host embeds <saas-agent /> in their web app.
 * The shell:
 *   • Renders the conversational pane (side-panel render mode at MVP).
 *   • Hosts the multi-framework component registry (React + vanilla WC at MVP per ADR-015).
 *   • Subscribes to DOM observation events (MO + IO + custom semantic events per ADR-022).
 *   • Bridges typed-JSON instruction emit ↔ runtime over the real-time transport (TBD Q6.3).
 *
 * Status: Phase 0 (skeleton — render is a placeholder).
 */

export const VERSION = '0.0.0';

/** Render modes per ADR-004 (side-panel only at MVP; others at v1+). */
export type RenderMode = 'side-panel' | 'full-page' | 'drawer' | 'eject';

export interface ShellAttributes {
  /** Render mode (defaults to side-panel per MVP scope). */
  mode?: RenderMode;
  /** Runtime endpoint URL. */
  runtime?: string;
}

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
        SaaSAgent shell v${VERSION} — Phase 0 scaffold (mode: ${mode}).
      </div>
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('saas-agent')) {
  customElements.define('saas-agent', SaaSAgentShell);
}
