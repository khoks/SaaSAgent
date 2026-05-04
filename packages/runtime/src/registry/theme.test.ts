import { describe, it, expect } from 'vitest';
import type { DTCGTokenGroup } from '@saasagent/protocol';
import { InMemoryThemeRegistry, flattenDTCG } from './theme.js';

const sampleTokens: DTCGTokenGroup = {
  color: {
    brand: {
      primary: { $value: '#0071dc', $type: 'color' },
      secondary: { $value: '#ffc220', $type: 'color' },
    },
    neutral: {
      $description: 'Grayscale palette',
      '100': { $value: '#ffffff', $type: 'color' },
      '900': { $value: '#111827', $type: 'color' },
    },
  },
  spacing: {
    sm: { $value: '8px', $type: 'dimension' },
    md: { $value: '16px', $type: 'dimension' },
  },
};

describe('InMemoryThemeRegistry', () => {
  it('starts with the empty default at version 0.0.0', () => {
    const r = new InMemoryThemeRegistry();
    const t = r.get();
    expect(t.name).toBe('default');
    expect(t.version).toBe('0.0.0');
    expect(Object.keys(t.tokens)).toHaveLength(0);
  });

  it('replace() sets name + tokens and bumps version', () => {
    const r = new InMemoryThemeRegistry();
    r.replace({ name: 'walmart', tokens: sampleTokens });
    expect(r.get().name).toBe('walmart');
    expect(r.get().version).toBe('1.0.0');
    expect(r.get().tokens).toBe(sampleTokens);
  });

  it('clear() resets to empty default but keeps bumping version', () => {
    const r = new InMemoryThemeRegistry();
    r.replace({ name: 'walmart', tokens: sampleTokens });
    r.clear();
    expect(r.get().name).toBe('default');
    expect(r.get().version).toBe('2.0.0');
    expect(Object.keys(r.get().tokens)).toHaveLength(0);
  });
});

describe('flattenDTCG', () => {
  it('walks nested groups and emits dot-path keys', () => {
    const flat = flattenDTCG(sampleTokens);
    expect(flat['color.brand.primary']).toBe('#0071dc');
    expect(flat['color.brand.secondary']).toBe('#ffc220');
    expect(flat['color.neutral.100']).toBe('#ffffff');
    expect(flat['color.neutral.900']).toBe('#111827');
    expect(flat['spacing.sm']).toBe('8px');
    expect(flat['spacing.md']).toBe('16px');
  });

  it('skips $description / $type metadata keys', () => {
    const flat = flattenDTCG(sampleTokens);
    expect(flat['color.neutral.$description']).toBeUndefined();
    expect(flat['color.brand.primary.$type']).toBeUndefined();
  });

  it('serializes composite token values as JSON strings', () => {
    const tokens: DTCGTokenGroup = {
      shadow: {
        sm: {
          $value: { color: '#000', x: 0, y: 1, blur: 2, spread: 0 },
          $type: 'shadow',
        },
      },
    };
    const flat = flattenDTCG(tokens);
    expect(typeof flat['shadow.sm']).toBe('string');
    expect(JSON.parse(flat['shadow.sm'] as string)).toEqual({ color: '#000', x: 0, y: 1, blur: 2, spread: 0 });
  });

  it('returns an empty object for an empty group', () => {
    expect(flattenDTCG({})).toEqual({});
  });
});
