/**
 * Quota banner — visible "X requests remaining" affordance.
 *
 * Phase 7 / ADR-019. The runtime attaches a QuotaStatus to every composed
 * layout's metadata when a TierProvider is configured. This widget reads
 * that and renders a compact indicator above the layout.
 *
 * Plain DOM, inline-styled, framework-agnostic. Three visual states:
 *   • "fine"      — > 20% remaining, normal text.
 *   • "warning"   — ≤ 20% remaining, amber.
 *   • "exceeded"  — allowed=false, red. Shows reset time.
 *
 * Hidden entirely when QuotaStatus is null (no provider configured) — the
 * open-source / unlimited mode shouldn't show any quota chrome.
 */

import type { QuotaStatus } from '@saasagent/protocol';

export interface QuotaBannerOptions {
  /** Compact mode: render inline within a status row (default false). */
  compact?: boolean;
}

export class QuotaBanner {
  readonly element: HTMLElement;
  private currentStatus: QuotaStatus | null = null;

  constructor(opts: QuotaBannerOptions = {}) {
    this.element = document.createElement('div');
    this.element.setAttribute('data-saas-agent-quota-banner', '');
    this.element.style.cssText = [
      'display: none',
      'padding: 4px 10px',
      'margin: 0 0 6px',
      'border-radius: 4px',
      `font: ${opts.compact ? '10px' : '11px'}/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`,
      'border: 1px solid transparent',
    ].join('; ');
  }

  /**
   * Update the banner. Pass null to clear/hide. Idempotent — re-rendering
   * the same status doesn't reflow.
   */
  update(status: QuotaStatus | null | undefined): void {
    if (!status) {
      if (this.currentStatus !== null) {
        this.element.style.display = 'none';
        this.element.innerHTML = '';
        this.currentStatus = null;
      }
      return;
    }
    // Same status? Skip the DOM write.
    if (this.currentStatus && shallowEqualQuota(this.currentStatus, status)) return;
    this.currentStatus = status;
    this.element.style.display = 'block';
    const tierLabel = status.tier;
    const isUnlimited = status.limit === null;
    let visualState: 'fine' | 'warning' | 'exceeded';
    let body: string;
    if (!status.allowed) {
      visualState = 'exceeded';
      const resetLocal = friendlyReset(status.resetAtUtc);
      const reason =
        status.reason === 'tier-not-found'
          ? `Your tier (${tierLabel}) is not configured — contact your administrator.`
          : status.reason === 'provider-error'
            ? `Quota check temporarily unavailable. Requests may resume shortly.`
            : `You've used ${status.used}/${status.limit} requests today on the ${tierLabel} tier.`;
      body = `<strong>Quota exceeded.</strong> ${reason} Resets at ${resetLocal}.`;
    } else if (isUnlimited) {
      // Unlimited tier — show only on the first cycle as a confirmation; we
      // could render nothing here, but a single faint line is useful for the
      // user-test gate (so testers verify they're on the right tier).
      visualState = 'fine';
      body = `Unlimited (${tierLabel}) — ${status.used} requests this session.`;
    } else {
      const pctUsed = status.limit ? status.used / status.limit : 0;
      visualState = pctUsed >= 0.8 ? 'warning' : 'fine';
      body = `${status.remaining} of ${status.limit} requests remaining today (${tierLabel} tier).`;
    }
    this.element.style.background =
      visualState === 'exceeded'
        ? '#fee2e2'
        : visualState === 'warning'
          ? '#fef3c7'
          : '#f3f4f6';
    this.element.style.color =
      visualState === 'exceeded'
        ? '#7f1d1d'
        : visualState === 'warning'
          ? '#78350f'
          : '#374151';
    this.element.style.borderColor =
      visualState === 'exceeded'
        ? '#fca5a5'
        : visualState === 'warning'
          ? '#fcd34d'
          : '#e5e7eb';
    this.element.innerHTML = body;
  }
}

function shallowEqualQuota(a: QuotaStatus, b: QuotaStatus): boolean {
  return (
    a.allowed === b.allowed &&
    a.tier === b.tier &&
    a.used === b.used &&
    a.limit === b.limit &&
    a.remaining === b.remaining &&
    a.resetAtUtc === b.resetAtUtc &&
    a.reason === b.reason
  );
}

function friendlyReset(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
