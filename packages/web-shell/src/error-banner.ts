/**
 * Error banner — degraded-mode visible UI for ErrorEnvelopes received from the runtime.
 *
 * Per ADR-005 + Phase 1.4.3 design note: the agent shell's error display is intentionally
 * NOT composed from registered atomic primitives, because the failure path can't depend
 * on the registry being populated or the composer being healthy. A plain DOM banner is
 * always renderable, robust to mid-flight registry/theme/composer failures.
 *
 * The banner sits ABOVE the rendered layout (separate sibling), so a subsequent successful
 * layout doesn't clobber it — the shell explicitly clears it on the next `layout` event.
 *
 * Inline styles (no external CSS) so this works in any host page without theme conflicts.
 */

import type { ErrorEnvelope } from '@saasagent/protocol';

const BANNER_ATTR = 'data-saas-agent-error';

/** Render or update an error banner inside the given container. */
export function showErrorBanner(container: HTMLElement, envelope: ErrorEnvelope): HTMLElement {
  let banner = container.querySelector<HTMLElement>(`[${BANNER_ATTR}]`);
  if (!banner) {
    banner = document.createElement('div');
    banner.setAttribute(BANNER_ATTR, '');
    banner.style.cssText = [
      'background: #fef2f2',
      'border: 1px solid #fecaca',
      'color: #991b1b',
      'border-radius: 6px',
      'padding: 10px 12px',
      'margin: 0 0 12px 0',
      'font: 13px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    ].join('; ');
    container.prepend(banner);
  }

  banner.setAttribute('data-category', envelope.category);
  banner.setAttribute('data-code', envelope.code);
  banner.setAttribute('data-retryable', String(envelope.retryable));

  const retryableHint = envelope.retryable
    ? ' <span style="color:#0369a1; font-weight:500;">(retryable)</span>'
    : '';
  banner.innerHTML = `
    <div style="display:flex; align-items:baseline; gap:8px;">
      <strong style="text-transform:uppercase; font-size:11px; letter-spacing:0.04em;">${escapeHtml(envelope.category)}</strong>
      <span style="font-size:11px; opacity:0.7;">${escapeHtml(envelope.code)}</span>
      ${retryableHint}
    </div>
    <div style="margin-top:4px;">${escapeHtml(envelope.message)}</div>
  `.trim();

  return banner;
}

/** Remove the error banner from the container, if present. */
export function clearErrorBanner(container: HTMLElement): void {
  container.querySelector(`[${BANNER_ATTR}]`)?.remove();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
