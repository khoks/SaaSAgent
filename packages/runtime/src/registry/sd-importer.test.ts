import { describe, it, expect } from 'vitest';
import { importStyleDictionary, inferType } from './sd-importer.js';

describe('inferType', () => {
  it('detects hex colors', () => {
    expect(inferType('#abc')).toBe('color');
    expect(inferType('#abcdef')).toBe('color');
    expect(inferType('#abcdef00')).toBe('color');
    expect(inferType('#0071DC')).toBe('color');
  });
  it('detects rgb / hsl colors', () => {
    expect(inferType('rgb(0, 113, 220)')).toBe('color');
    expect(inferType('rgba(0,0,0,0.5)')).toBe('color');
    expect(inferType('hsl(210, 100%, 50%)')).toBe('color');
    expect(inferType('hsla(0,0%,0%,0.1)')).toBe('color');
  });
  it('detects dimensions', () => {
    expect(inferType('16px')).toBe('dimension');
    expect(inferType('1.5rem')).toBe('dimension');
    expect(inferType('100%')).toBe('dimension');
    expect(inferType('2vw')).toBe('dimension');
  });
  it('detects durations', () => {
    expect(inferType('200ms')).toBe('duration');
    expect(inferType('0.3s')).toBe('duration');
  });
  it('detects raw numbers', () => {
    expect(inferType(42)).toBe('number');
    expect(inferType(0)).toBe('number');
    expect(inferType(-1.5)).toBe('number');
  });
  it('returns undefined for unrecognized strings', () => {
    expect(inferType('Helvetica Neue')).toBeUndefined();
    expect(inferType('bold')).toBeUndefined();
  });
});

describe('importStyleDictionary', () => {
  it('converts a simple SD tree to DTCG', () => {
    const sd = {
      color: {
        brand: {
          primary: { value: '#0071dc' },
          accent: { value: '#ffc220' },
        },
      },
    };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, Record<string, { $value: string; $type: string }>>>;
    expect(dtcg.color!.brand!.primary).toEqual({ $value: '#0071dc', $type: 'color' });
    expect(dtcg.color!.brand!.accent).toEqual({ $value: '#ffc220', $type: 'color' });
  });

  it('infers dimension type from value', () => {
    const sd = { spacing: { md: { value: '16px' } } };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, { $value: string; $type: string }>>;
    expect(dtcg.spacing!.md).toEqual({ $value: '16px', $type: 'dimension' });
  });

  it('uses attributes.category as explicit $type when present', () => {
    const sd = {
      font: {
        heading: { value: 'Helvetica', attributes: { category: 'fontFamily' } },
      },
    };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, { $value: string; $type: string }>>;
    expect(dtcg.font!.heading).toEqual({ $value: 'Helvetica', $type: 'fontFamily' });
  });

  it('omits $type when neither attributes.category nor inference yields one', () => {
    const sd = { motion: { easing: { value: 'ease-in-out' } } };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, { $value: string; $type?: string }>>;
    expect(dtcg.motion!.easing).toEqual({ $value: 'ease-in-out' });
  });

  it('maps SD `comment` to DTCG `$description`', () => {
    const sd = {
      color: { brand: { primary: { value: '#0071dc', comment: 'Walmart blue' } } },
    };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, Record<string, { $description: string }>>>;
    expect(dtcg.color!.brand!.primary!.$description).toBe('Walmart blue');
  });

  it('handles deeply nested groups', () => {
    const sd = {
      a: { b: { c: { d: { value: '#000', attributes: { category: 'color' } } } } },
    };
    const dtcg = importStyleDictionary(sd) as Record<string, unknown>;
    const drilled: any = (((dtcg.a as any).b as any).c as any).d;
    expect(drilled.$value).toBe('#000');
    expect(drilled.$type).toBe('color');
  });

  it('returns empty for non-object input', () => {
    expect(importStyleDictionary(null)).toEqual({});
    expect(importStyleDictionary(undefined)).toEqual({});
    expect(importStyleDictionary('hello')).toEqual({});
    expect(importStyleDictionary([1, 2, 3])).toEqual({});
  });

  it('ignores non-token leaf nodes (no value field) at the same depth', () => {
    const sd = {
      color: {
        primary: { value: '#0071dc' },
        meta: { description: 'palette intro' }, // not a token (no `value`); recursed as group
      },
    };
    const dtcg = importStyleDictionary(sd) as Record<string, Record<string, unknown>>;
    expect(dtcg.color!.primary).toEqual({ $value: '#0071dc', $type: 'color' });
    expect(dtcg.color!.meta).toEqual({}); // recursed as group; no value-bearing leaves
  });
});
