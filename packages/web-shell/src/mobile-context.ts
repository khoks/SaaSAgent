/**
 * Mobile-context detection — Phase 5 (ADR-017).
 *
 * The shell measures the host browser's render context and reports it to the
 * runtime so the composer can adapt: more list density on mobile, no hover
 * affordances on touch, lighter media on slow networks.
 *
 * Detection sources:
 *   • deviceClass — derived from viewportWidth (mobile <768, tablet <1024, desktop)
 *                   AND `navigator.userAgentData?.mobile` when supported.
 *   • viewportWidth — `window.innerWidth` (in CSS pixels per ADR-017).
 *   • inputMode — combines `navigator.maxTouchPoints` + matchMedia('(hover: hover)')
 *                 to distinguish touch / pointer / hybrid (e.g. touchscreen laptop).
 *   • networkClass — Network Information API `navigator.connection.effectiveType`
 *                    when available; otherwise `undefined` (composer can fall back).
 *
 * The mobile context is sent in two ways:
 *   1. As a query param on the SSE connection at first connect (?mobile=...) so
 *      the welcome layout already reflects the device.
 *   2. As a `mobile-context` envelope over WS whenever the viewport changes
 *      (debounced 250ms — orientation change, resize, etc).
 *
 * Note: this is the SHELL side. The runtime intercepts `mobile-context`
 * envelopes BEFORE the planner (like eval-feedback) and stashes them on the
 * per-WS state, threading into ComposeContext.mobileContext on subsequent plans.
 */

import type { MobileContext } from '@saasagent/protocol';

/** Read once on connect. */
export function detectMobileContext(win: Window = window): MobileContext {
  const viewportWidth = win.innerWidth || 1024;
  const deviceClass = classifyDevice(win, viewportWidth);
  const inputMode = classifyInput(win);
  const networkClass = classifyNetwork(win);
  const out: MobileContext = { deviceClass, viewportWidth, inputMode };
  if (networkClass) out.networkClass = networkClass;
  return out;
}

function classifyDevice(win: Window, viewportWidth: number): MobileContext['deviceClass'] {
  // Prefer the UA-Client-Hint mobile signal when present.
  const uaData = (win.navigator as unknown as { userAgentData?: { mobile?: boolean } }).userAgentData;
  if (uaData?.mobile === true) return 'mobile';
  // Fall back to viewport breakpoints (matches typical CSS conventions).
  if (viewportWidth < 768) return 'mobile';
  if (viewportWidth < 1024) return 'tablet';
  return 'desktop';
}

function classifyInput(win: Window): MobileContext['inputMode'] {
  const touch = (win.navigator.maxTouchPoints ?? 0) > 0;
  const hover = typeof win.matchMedia === 'function' ? win.matchMedia('(hover: hover)').matches : true;
  if (touch && !hover) return 'touch';
  if (touch && hover) return 'hybrid';
  return 'pointer';
}

function classifyNetwork(win: Window): MobileContext['networkClass'] | undefined {
  const conn = (win.navigator as unknown as { connection?: { effectiveType?: string } }).connection;
  const eff = conn?.effectiveType;
  if (eff === '4g' || eff === '3g' || eff === '2g' || eff === 'slow-2g') return eff;
  // Network Information API doesn't report 'wifi' standardly; treat unknown 4g+ as wifi
  // when downlink suggests broadband. For MVP keep undefined.
  return undefined;
}

/**
 * Watch for viewport changes and call back with a fresh MobileContext.
 * Returns a disposer that detaches all listeners.
 */
export function watchMobileContext(
  cb: (ctx: MobileContext) => void,
  win: Window = window,
  debounceMs = 250,
): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const fire = (): void => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => cb(detectMobileContext(win)), debounceMs);
  };
  win.addEventListener('resize', fire);
  win.addEventListener('orientationchange', fire);
  const conn = (win.navigator as unknown as { connection?: EventTarget }).connection;
  conn?.addEventListener?.('change', fire);
  return () => {
    if (timer) clearTimeout(timer);
    win.removeEventListener('resize', fire);
    win.removeEventListener('orientationchange', fire);
    conn?.removeEventListener?.('change', fire);
  };
}
