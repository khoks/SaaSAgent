// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { styleFor, openEjectedWindow } from './render-modes.js';

describe('styleFor', () => {
  it('returns the side-panel default style', () => {
    const s = styleFor('side-panel');
    expect(s).toContain('border: 1px dashed');
    expect(s).toContain('min-height: 320px');
  });

  it('full-page style fills the viewport', () => {
    const s = styleFor('full-page');
    expect(s).toContain('min-height: 100vh');
    expect(s).toContain('width: 100%');
  });

  it('drawer style is fixed-positioned on the right edge', () => {
    const s = styleFor('drawer');
    expect(s).toContain('position: fixed');
    expect(s).toContain('right: 0');
    expect(s).toContain('z-index: 9999');
  });

  it('eject style is a thin placeholder for the popped-out window', () => {
    const s = styleFor('eject');
    expect(s).toContain('border: 1px dashed');
    expect(s).toContain('min-height: 80px');
  });

  it('falls back to side-panel for unknown modes', () => {
    const s = styleFor('weird-mode' as never);
    expect(s).toContain('min-height: 320px');
  });
});

describe('openEjectedWindow', () => {
  it('returns null when window.open is blocked', () => {
    const original = window.open;
    (window as unknown as { open: typeof window.open }).open = () => null;
    try {
      expect(openEjectedWindow('http://localhost:8080')).toBeNull();
    } finally {
      (window as unknown as { open: typeof window.open }).open = original;
    }
  });

  it('opens a popup with the runtime URL injected', () => {
    let openedUrl: string | undefined;
    let openedName: string | undefined;
    let writtenHTML = '';
    const fakePopup = {
      document: {
        open: () => undefined,
        write: (s: string) => {
          writtenHTML = s;
        },
        close: () => undefined,
      },
    } as unknown as Window;
    const original = window.open;
    (window as unknown as { open: (url?: string, name?: string) => Window | null }).open = (
      url,
      name,
    ) => {
      openedUrl = url;
      openedName = name;
      return fakePopup;
    };
    try {
      const w = openEjectedWindow('http://my-runtime:9000', { name: 'custom-popup' });
      expect(w).toBe(fakePopup);
      expect(openedUrl).toBe('');
      expect(openedName).toBe('custom-popup');
      expect(writtenHTML).toContain('SaaSAgent (ejected)');
      expect(writtenHTML).toContain('data-runtime-url="http://my-runtime:9000"');
      expect(writtenHTML).toContain("'mode', 'full-page'");
    } finally {
      (window as unknown as { open: typeof window.open }).open = original;
    }
  });

  it('uses default name when none provided', () => {
    let openedName: string | undefined;
    const original = window.open;
    (window as unknown as { open: (url?: string, name?: string) => Window | null }).open = (
      _url,
      name,
    ) => {
      openedName = name;
      return {
        document: { open: () => undefined, write: () => undefined, close: () => undefined },
      } as unknown as Window;
    };
    try {
      openEjectedWindow('http://localhost:8080');
      expect(openedName).toBe('saas-agent-ejected');
    } finally {
      (window as unknown as { open: typeof window.open }).open = original;
    }
  });
});
