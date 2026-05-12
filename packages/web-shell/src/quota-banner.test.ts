// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { QuotaBanner } from './quota-banner.js';
import type { QuotaStatus } from '@saasagent/protocol';

describe('QuotaBanner', () => {
  let banner: QuotaBanner;
  beforeEach(() => {
    banner = new QuotaBanner();
    document.body.appendChild(banner.element);
  });

  it('hidden by default (display: none)', () => {
    expect(banner.element.style.display).toBe('none');
    expect(banner.element.innerHTML).toBe('');
  });

  it('renders fine state when remaining > 20%', () => {
    const s: QuotaStatus = {
      allowed: true,
      tier: 'free',
      used: 1,
      limit: 10,
      remaining: 9,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
    };
    banner.update(s);
    expect(banner.element.style.display).toBe('block');
    expect(banner.element.innerHTML).toContain('9 of 10');
    expect(banner.element.innerHTML).toContain('free');
    // fine background is the neutral gray
    expect(banner.element.style.background).toBe('rgb(243, 244, 246)');
  });

  it('renders warning state when ≤ 20% remaining', () => {
    banner.update({
      allowed: true,
      tier: 'free',
      used: 9,
      limit: 10,
      remaining: 1,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
    });
    // warning amber background
    expect(banner.element.style.background).toBe('rgb(254, 243, 199)');
    expect(banner.element.innerHTML).toContain('1 of 10');
  });

  it('renders exceeded state when allowed=false', () => {
    banner.update({
      allowed: false,
      tier: 'free',
      used: 10,
      limit: 10,
      remaining: 0,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
      reason: 'quota-exceeded',
    });
    expect(banner.element.style.background).toBe('rgb(254, 226, 226)');
    expect(banner.element.innerHTML).toContain('Quota exceeded');
    expect(banner.element.innerHTML).toContain('Resets at');
  });

  it('shows tier-not-found reason text', () => {
    banner.update({
      allowed: false,
      tier: 'mystery',
      used: 0,
      limit: 0,
      remaining: 0,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
      reason: 'tier-not-found',
    });
    expect(banner.element.innerHTML).toContain('contact your administrator');
  });

  it('renders unlimited tier as informational', () => {
    banner.update({
      allowed: true,
      tier: 'enterprise',
      used: 42,
      limit: null,
      remaining: null,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
    });
    expect(banner.element.innerHTML).toContain('Unlimited');
    expect(banner.element.innerHTML).toContain('enterprise');
  });

  it('hides when status set to null after being visible', () => {
    banner.update({
      allowed: true,
      tier: 'free',
      used: 1,
      limit: 10,
      remaining: 9,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
    });
    expect(banner.element.style.display).toBe('block');
    banner.update(null);
    expect(banner.element.style.display).toBe('none');
    expect(banner.element.innerHTML).toBe('');
  });

  it('skips DOM write when same status passed twice (idempotent)', () => {
    const s: QuotaStatus = {
      allowed: true,
      tier: 'free',
      used: 1,
      limit: 10,
      remaining: 9,
      resetAtUtc: '2026-05-12T00:00:00.000Z',
    };
    banner.update(s);
    const html1 = banner.element.innerHTML;
    banner.update({ ...s });
    expect(banner.element.innerHTML).toBe(html1);
  });
});
