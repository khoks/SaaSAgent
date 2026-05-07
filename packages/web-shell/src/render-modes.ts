/**
 * Render modes — Phase 5 (ADR-004).
 *
 * Per ADR-004 the shell supports four render modes:
 *
 *   side-panel — narrow column docked to the right (default).
 *   full-page  — the agent fills the viewport (mobile-default friendly).
 *   drawer     — overlay that slides in from the right; backdrop dims the host.
 *   eject      — agent pops out into a separate window via window.open().
 *
 * Implementation is plain CSS via inline styles on the shell's outer container —
 * no framework, no shadow DOM. Mode is set via the `mode` attribute on the
 * `<saas-agent>` element. Mode change at runtime is supported (host can mutate
 * the attribute via JS or the user can toggle from a UI affordance the host
 * provides).
 */

import type { RenderMode } from './render-modes-types.js';

/**
 * Returns the CSS string the outer shell container should set on its style
 * attribute for a given render mode.
 */
export function styleFor(mode: RenderMode): string {
  switch (mode) {
    case 'full-page':
      return [
        'font-family: system-ui',
        'padding: 16px',
        'border: none',
        'color: #111',
        'display: flex',
        'flex-direction: column',
        'min-height: 100vh',
        'width: 100%',
        'box-sizing: border-box',
        'background: #fafafa',
      ].join('; ');

    case 'drawer':
      // Anchored to the right edge as a 380px-wide overlay. The outer
      // container is positioned fixed so the host page behind shows through.
      return [
        'font-family: system-ui',
        'padding: 16px',
        'border-left: 1px solid #e5e7eb',
        'color: #111',
        'display: flex',
        'flex-direction: column',
        'position: fixed',
        'top: 0',
        'right: 0',
        'bottom: 0',
        'width: 380px',
        'max-width: 90vw',
        'background: white',
        'box-shadow: -4px 0 16px rgba(0,0,0,0.1)',
        'z-index: 9999',
        'overflow-y: auto',
      ].join('; ');

    case 'eject':
      // When ejected, the in-page shell shows a placeholder pointing the
      // user to the popped-out window (handled by the SaaSAgentShell class).
      return [
        'font-family: system-ui',
        'padding: 16px',
        'border: 1px dashed #d1d5db',
        'color: #6b7280',
        'display: flex',
        'flex-direction: column',
        'min-height: 80px',
        'background: #fafafa',
      ].join('; ');

    case 'side-panel':
    default:
      return [
        'font-family: system-ui',
        'padding: 8px',
        'border: 1px dashed #888',
        'color: #555',
        'display: flex',
        'flex-direction: column',
        'min-height: 320px',
      ].join('; ');
  }
}

/**
 * Open a popped-out shell window for `mode='eject'`. Returns the popup window
 * handle (or null when blocked by the popup blocker / SSR / unavailable).
 *
 * The popped-out window hosts a fresh `<saas-agent mode="full-page">` connected
 * to the same runtime URL. Cross-window state isn't synchronized at MVP — the
 * popped agent is a separate session. (Phase-5.x will add BroadcastChannel
 * sync for shared sessionId.)
 */
export function openEjectedWindow(runtimeUrl: string, opts: { name?: string } = {}): Window | null {
  if (typeof window === 'undefined') return null;
  const name = opts.name ?? 'saas-agent-ejected';
  const features = 'width=480,height=720,resizable=yes,scrollbars=yes';
  const popup = window.open('', name, features);
  if (!popup) return null;
  const escapedUrl = runtimeUrl.replace(/"/g, '&quot;');
  popup.document.open();
  popup.document.write(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>SaaSAgent (ejected)</title>
  <style>html,body{margin:0;height:100%;font-family:system-ui;}</style>
</head>
<body data-runtime-url="${escapedUrl}">
<script>
  (function () {
    var runtimeUrl = document.body.getAttribute('data-runtime-url') || '';
    var tag = window.opener && window.opener.customElements && window.opener.customElements.get('saas-agent');
    if (!tag) {
      document.body.innerHTML = '<p style="padding:16px">Agent unavailable: parent window closed or did not load @saasagent/web-shell.</p>';
      return;
    }
    if (!window.customElements.get('saas-agent')) {
      window.customElements.define('saas-agent', tag);
    }
    var el = document.createElement('saas-agent');
    el.setAttribute('runtime', runtimeUrl);
    el.setAttribute('mode', 'full-page');
    document.body.appendChild(el);
  })();
</script>
</body>
</html>`);
  popup.document.close();
  return popup;
}
