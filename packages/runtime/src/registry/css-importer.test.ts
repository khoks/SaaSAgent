import { describe, it, expect } from 'vitest';
import { importCssVariables } from './css-importer.js';

describe('importCssVariables', () => {
  it('parses a simple :root block', () => {
    const out = importCssVariables(`
      :root {
        --color-brand-primary: #0071dc;
        --color-brand-accent: #ffc220;
      }
    `) as Record<string, Record<string, Record<string, { $value: string; $type: string }>>>;
    expect(out.color!.brand!.primary).toEqual({ $value: '#0071dc', $type: 'color' });
    expect(out.color!.brand!.accent).toEqual({ $value: '#ffc220', $type: 'color' });
  });

  it('infers types per declaration', () => {
    const out = importCssVariables(`
      :root {
        --spacing-md: 16px;
        --duration-fast: 200ms;
        --color-text: #111827;
        --motion-easing: ease-in-out;
      }
    `) as Record<string, Record<string, { $value: string; $type?: string }>>;
    expect(out.spacing!.md).toEqual({ $value: '16px', $type: 'dimension' });
    expect(out.duration!.fast).toEqual({ $value: '200ms', $type: 'duration' });
    expect(out.color!.text).toEqual({ $value: '#111827', $type: 'color' });
    expect(out.motion!.easing).toEqual({ $value: 'ease-in-out' }); // no inferred type
  });

  it('handles multiple selectors by flattening', () => {
    const out = importCssVariables(`
      :root { --color-brand-primary: #0071dc; }
      [data-theme="dark"] { --color-brand-primary: #1e40af; }
    `) as Record<string, Record<string, Record<string, { $value: string }>>>;
    // Last write wins; this is documented as a degraded path.
    expect(out.color!.brand!.primary!.$value).toBe('#1e40af');
  });

  it('strips /* */ comments', () => {
    const out = importCssVariables(`
      :root {
        /* primary brand colour */
        --color-brand-primary: #0071dc;
        /* spacing scale: --spacing-md: 999px; should NOT count */
        --spacing-md: 16px;
      }
    `) as Record<string, Record<string, { $value: string }>>;
    expect(out.color!.brand!.primary!.$value).toBe('#0071dc');
    expect(out.spacing!.md!.$value).toBe('16px'); // not the commented-out 999px
  });

  it('returns empty for empty input', () => {
    expect(importCssVariables('')).toEqual({});
    expect(importCssVariables(null as unknown as string)).toEqual({});
  });

  it('tolerates malformed CSS — extracts what it can', () => {
    const out = importCssVariables(`
      not really css here {{
      --color-brand-primary: #0071dc;
      } more junk
    `) as Record<string, Record<string, Record<string, { $value: string }>>>;
    expect(out.color!.brand!.primary!.$value).toBe('#0071dc');
  });

  it('preserves single-segment names (no nesting)', () => {
    const out = importCssVariables(`:root { --primary: #0071dc; }`) as Record<string, { $value: string; $type: string }>;
    expect(out.primary).toEqual({ $value: '#0071dc', $type: 'color' });
  });

  it('ignores standard CSS properties (no leading --)', () => {
    const out = importCssVariables(`
      :root {
        color: red;
        --color-brand-primary: #0071dc;
        background: blue;
      }
    `) as Record<string, Record<string, Record<string, { $value: string }>>>;
    expect(out.color!.brand!.primary!.$value).toBe('#0071dc');
    expect(Object.keys(out)).toEqual(['color']); // only --color-brand-primary, not the standard `color: red`
  });
});
