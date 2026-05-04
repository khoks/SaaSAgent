// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { ErrorEnvelope } from '@saasagent/protocol';
import { showErrorBanner, clearErrorBanner } from './error-banner.js';

const sampleEnvelope: ErrorEnvelope = {
  category: 'composer-error',
  code: 'provider-error',
  message: 'API rate limit exceeded',
  retryable: true,
  emittedAt: '2026-05-08T00:00:00Z',
};

describe('showErrorBanner / clearErrorBanner', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  it('inserts a banner with the envelope category, code, and message', () => {
    showErrorBanner(container, sampleEnvelope);
    const banner = container.querySelector('[data-saas-agent-error]')!;
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('data-category')).toBe('composer-error');
    expect(banner.getAttribute('data-code')).toBe('provider-error');
    expect(banner.getAttribute('data-retryable')).toBe('true');
    expect(banner.textContent).toContain('API rate limit exceeded');
    expect(banner.textContent).toContain('composer-error');
  });

  it('shows the retryable hint when envelope.retryable=true', () => {
    showErrorBanner(container, sampleEnvelope);
    const banner = container.querySelector('[data-saas-agent-error]')!;
    expect(banner.innerHTML).toContain('retryable');
  });

  it('omits the retryable hint when envelope.retryable=false', () => {
    showErrorBanner(container, { ...sampleEnvelope, retryable: false });
    const banner = container.querySelector('[data-saas-agent-error]')!;
    expect(banner.getAttribute('data-retryable')).toBe('false');
    expect(banner.innerHTML).not.toContain('retryable');
  });

  it('updates the existing banner instead of creating a duplicate', () => {
    showErrorBanner(container, sampleEnvelope);
    showErrorBanner(container, { ...sampleEnvelope, message: 'second error' });
    expect(container.querySelectorAll('[data-saas-agent-error]')).toHaveLength(1);
    expect(container.querySelector('[data-saas-agent-error]')!.textContent).toContain('second error');
  });

  it('escapes HTML in the message to prevent XSS', () => {
    showErrorBanner(container, {
      ...sampleEnvelope,
      message: '<img src=x onerror=alert(1)>',
    });
    const banner = container.querySelector('[data-saas-agent-error]')!;
    expect(banner.querySelector('img')).toBeNull();
    expect(banner.innerHTML).toContain('&lt;img');
  });

  it('prepends the banner so it sits above existing content', () => {
    container.innerHTML = '<div id="existing">existing layout</div>';
    showErrorBanner(container, sampleEnvelope);
    expect(container.firstElementChild?.getAttribute('data-saas-agent-error')).toBe('');
    expect(container.querySelector('#existing')).toBeTruthy(); // existing content preserved
  });

  it('clearErrorBanner removes the banner', () => {
    showErrorBanner(container, sampleEnvelope);
    expect(container.querySelector('[data-saas-agent-error]')).toBeTruthy();
    clearErrorBanner(container);
    expect(container.querySelector('[data-saas-agent-error]')).toBeNull();
  });

  it('clearErrorBanner is a no-op when no banner exists', () => {
    expect(() => clearErrorBanner(container)).not.toThrow();
  });
});
