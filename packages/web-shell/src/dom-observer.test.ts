// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';

import { DomObserver } from './dom-observer.js';

let sent: InstructionEnvelope[] = [];
const transport: EmitTransport = { send: (env) => void sent.push(env) };
let seq = 0;

function makeObserver(opts: Partial<ConstructorParameters<typeof DomObserver>[0]> = {}): DomObserver {
  return new DomObserver({
    transport,
    getComposeCycleId: () => 'cyc-1',
    getSequence: () => seq++,
    ...opts,
  });
}

beforeEach(() => {
  sent = [];
  seq = 0;
  document.body.innerHTML = '';
  vi.useFakeTimers();
  // jsdom doesn't ship IntersectionObserver — minimal polyfill so the observer code can install.
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    class FakeIO {
      callback: IntersectionObserverCallback;
      constructor(cb: IntersectionObserverCallback) {
        this.callback = cb;
      }
      observe(): void {
        /* no-op */
      }
      unobserve(): void {
        /* no-op */
      }
      disconnect(): void {
        /* no-op */
      }
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    (globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      FakeIO as unknown as typeof IntersectionObserver;
  }
});

afterEach(() => {
  vi.useRealTimers();
});

describe('DomObserver — semantic events', () => {
  it('relays saasagent:event custom events as dom-semantic envelopes', () => {
    const obs = makeObserver().start();
    document.dispatchEvent(
      new CustomEvent('saasagent:event', {
        detail: { kind: 'cart-updated', payload: { itemCount: 3, total: 99.97 } },
      }),
    );
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      type: 'dom-semantic',
      sourceNodeId: 'dom-observer',
      payload: { kind: 'cart-updated', payload: { itemCount: 3, total: 99.97 } },
    });
    obs.stop();
  });

  it('ignores custom events without a `kind` field', () => {
    const obs = makeObserver().start();
    document.dispatchEvent(new CustomEvent('saasagent:event', { detail: { payload: {} } }));
    document.dispatchEvent(new CustomEvent('saasagent:event', { detail: undefined }));
    expect(sent).toHaveLength(0);
    obs.stop();
  });

  it('does not relay events after stop()', () => {
    const obs = makeObserver().start();
    obs.stop();
    document.dispatchEvent(new CustomEvent('saasagent:event', { detail: { kind: 'x' } }));
    expect(sent).toHaveLength(0);
  });
});

describe('DomObserver — mutations', () => {
  it('emits a dom-mutation envelope when an annotated region changes', async () => {
    document.body.innerHTML = '<div data-saas-agent-observe="cart"><span>0 items</span></div>';
    const obs = makeObserver({ mutationThrottleMs: 50 }).start();
    const cart = document.querySelector('[data-saas-agent-observe="cart"]')!;
    cart.querySelector('span')!.textContent = '3 items';

    // MutationObserver fires asynchronously — let the microtask queue drain.
    await Promise.resolve();
    vi.advanceTimersByTime(60);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      type: 'dom-mutation',
      payload: { region: 'cart' },
    });
    expect(sent[0]!.payload as { textSnapshot: string }).toMatchObject({
      textSnapshot: expect.stringContaining('3 items'),
    });
    obs.stop();
  });

  it('coalesces rapid mutations into one emission per throttle window', async () => {
    document.body.innerHTML = '<div data-saas-agent-observe="cart"></div>';
    const obs = makeObserver({ mutationThrottleMs: 100 }).start();
    const cart = document.querySelector('[data-saas-agent-observe="cart"]')!;
    for (let i = 0; i < 10; i++) {
      const el = document.createElement('span');
      el.textContent = `item ${i}`;
      cart.appendChild(el);
    }
    await Promise.resolve();
    vi.advanceTimersByTime(120);

    expect(sent).toHaveLength(1);
    expect((sent[0]!.payload as { count: number }).count).toBeGreaterThan(1);
    obs.stop();
  });

  it('ignores mutations outside annotated regions', async () => {
    document.body.innerHTML = '<div id="not-tracked"></div><div data-saas-agent-observe="watch-me"></div>';
    const obs = makeObserver({ mutationThrottleMs: 50 }).start();
    const untracked = document.getElementById('not-tracked')!;
    const tracked = document.querySelector('[data-saas-agent-observe="watch-me"]')!;
    untracked.appendChild(document.createElement('p')); // should be ignored
    tracked.appendChild(document.createElement('p')); // should fire

    await Promise.resolve();
    vi.advanceTimersByTime(60);

    expect(sent).toHaveLength(1);
    expect((sent[0]!.payload as { region: string }).region).toBe('watch-me');
    obs.stop();
  });

  it('truncates large textSnapshot to maxPayloadBytes', async () => {
    const big = 'x'.repeat(5000);
    document.body.innerHTML = `<div data-saas-agent-observe="big"><span></span></div>`;
    const obs = makeObserver({ mutationThrottleMs: 50, maxPayloadBytes: 200 }).start();
    document.querySelector('[data-saas-agent-observe="big"] span')!.textContent = big;
    await Promise.resolve();
    vi.advanceTimersByTime(60);
    const snapshot = (sent[0]!.payload as { textSnapshot: string }).textSnapshot;
    expect(snapshot.length).toBeLessThanOrEqual(200);
    expect(snapshot.endsWith('…')).toBe(true);
    obs.stop();
  });

  it('emits envelopes with monotonically increasing sequence', async () => {
    document.body.innerHTML = '<div data-saas-agent-observe="r"></div>';
    const obs = makeObserver({ mutationThrottleMs: 20 }).start();
    document.querySelector('[data-saas-agent-observe="r"]')!.appendChild(document.createElement('p'));
    await Promise.resolve();
    vi.advanceTimersByTime(30);
    document.querySelector('[data-saas-agent-observe="r"]')!.appendChild(document.createElement('p'));
    await Promise.resolve();
    vi.advanceTimersByTime(30);
    expect(sent.length).toBe(2);
    expect(sent[1]!.sequence).toBe(sent[0]!.sequence + 1);
    obs.stop();
  });
});
