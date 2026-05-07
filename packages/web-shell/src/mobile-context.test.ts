// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectMobileContext, watchMobileContext } from './mobile-context.js';

function fakeWindow(opts: {
  innerWidth?: number;
  maxTouchPoints?: number;
  hover?: boolean;
  uaMobile?: boolean;
  effectiveType?: string;
}): Window {
  const listeners: Record<string, Array<(e: Event) => void>> = {};
  const win = {
    innerWidth: opts.innerWidth ?? 1280,
    matchMedia: (q: string): MediaQueryList =>
      ({ matches: q.includes('hover: hover') ? !!opts.hover : false }) as unknown as MediaQueryList,
    navigator: {
      maxTouchPoints: opts.maxTouchPoints ?? 0,
      ...(opts.uaMobile !== undefined ? { userAgentData: { mobile: opts.uaMobile } } : {}),
      ...(opts.effectiveType
        ? {
            connection: {
              effectiveType: opts.effectiveType,
              addEventListener: (type: string, fn: (e: Event) => void) => {
                listeners[`conn:${type}`] = (listeners[`conn:${type}`] ?? []).concat(fn);
              },
              removeEventListener: (type: string, fn: (e: Event) => void) => {
                const arr = listeners[`conn:${type}`];
                if (arr) listeners[`conn:${type}`] = arr.filter((f) => f !== fn);
              },
            },
          }
        : {}),
    },
    addEventListener: (type: string, fn: (e: Event) => void) => {
      listeners[type] = (listeners[type] ?? []).concat(fn);
    },
    removeEventListener: (type: string, fn: (e: Event) => void) => {
      const arr = listeners[type];
      if (arr) listeners[type] = arr.filter((f) => f !== fn);
    },
    __fire: (type: string) => {
      (listeners[type] ?? []).forEach((fn) => fn({} as Event));
    },
  } as unknown as Window & { __fire: (t: string) => void };
  return win;
}

describe('detectMobileContext', () => {
  it('classifies desktop with hover-pointer when viewport is wide and no touch', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 1440, hover: true }));
    expect(ctx.deviceClass).toBe('desktop');
    expect(ctx.viewportWidth).toBe(1440);
    expect(ctx.inputMode).toBe('pointer');
  });

  it('classifies tablet at 900px viewport', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 900, hover: true }));
    expect(ctx.deviceClass).toBe('tablet');
  });

  it('classifies mobile at <768px viewport', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 414 }));
    expect(ctx.deviceClass).toBe('mobile');
  });

  it('honors UA-Client-Hint mobile=true even on a wide viewport (foldable etc)', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 1024, uaMobile: true }));
    expect(ctx.deviceClass).toBe('mobile');
  });

  it('reports touch when no hover and maxTouchPoints>0', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 414, maxTouchPoints: 5, hover: false }));
    expect(ctx.inputMode).toBe('touch');
  });

  it('reports hybrid for touchscreen laptops (touch + hover)', () => {
    const ctx = detectMobileContext(fakeWindow({ innerWidth: 1366, maxTouchPoints: 10, hover: true }));
    expect(ctx.inputMode).toBe('hybrid');
  });

  it('extracts networkClass from navigator.connection.effectiveType when present', () => {
    const ctx = detectMobileContext(fakeWindow({ effectiveType: '3g' }));
    expect(ctx.networkClass).toBe('3g');
  });

  it('omits networkClass when not available', () => {
    const ctx = detectMobileContext(fakeWindow({}));
    expect(ctx.networkClass).toBeUndefined();
  });
});

describe('watchMobileContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('debounces resize firings and calls back with fresh context', () => {
    const win = fakeWindow({ innerWidth: 1440, hover: true }) as Window & {
      __fire: (t: string) => void;
      innerWidth: number;
    };
    const calls: number[] = [];
    const dispose = watchMobileContext((ctx) => calls.push(ctx.viewportWidth), win, 100);
    win.innerWidth = 800;
    win.__fire('resize');
    win.innerWidth = 414;
    win.__fire('resize');
    win.__fire('orientationchange');
    expect(calls).toHaveLength(0); // debounced
    vi.advanceTimersByTime(120);
    expect(calls).toEqual([414]);
    dispose();
  });

  it('disposer detaches listeners', () => {
    const win = fakeWindow({}) as Window & { __fire: (t: string) => void };
    const calls: number[] = [];
    const dispose = watchMobileContext((c) => calls.push(c.viewportWidth), win, 50);
    dispose();
    win.__fire('resize');
    vi.advanceTimersByTime(100);
    expect(calls).toHaveLength(0);
  });
});
