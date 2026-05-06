import { describe, it, expect } from 'vitest';
import type { SkillDescriptor } from '@saasagent/protocol';
import { InMemorySkillRegistry } from './skills.js';

const priceCompare: SkillDescriptor = {
  name: 'price-compare',
  version: '1.0.0',
  description: 'Compare prices across two products',
  whenToUse: 'when the user wants to compare two products on price',
  kind: 'in-process',
  inputSchema: { type: 'object', properties: { a: { type: 'string' }, b: { type: 'string' } }, required: ['a', 'b'] },
};

const cartSummary: SkillDescriptor = {
  ...priceCompare,
  name: 'cart-summary',
  description: 'Summarize the user\'s current cart',
  whenToUse: 'when the user asks about their cart',
};

describe('InMemorySkillRegistry', () => {
  it('starts empty at 0.0.0', () => {
    const r = new InMemorySkillRegistry();
    expect(r.get()).toEqual({ version: '0.0.0', skills: {} });
  });

  it('replace sets all skills + bumps version', () => {
    const r = new InMemorySkillRegistry();
    r.replace([priceCompare, cartSummary]);
    expect(r.get().version).toBe('1.0.0');
    expect(Object.keys(r.get().skills).sort()).toEqual(['cart-summary', 'price-compare']);
  });

  it('upsert inserts then updates by name', () => {
    const r = new InMemorySkillRegistry();
    r.upsert(priceCompare);
    expect(r.get().skills['price-compare']?.description).toBe('Compare prices across two products');
    r.upsert({ ...priceCompare, description: 'updated' });
    expect(r.get().skills['price-compare']?.description).toBe('updated');
    expect(Object.keys(r.get().skills)).toHaveLength(1);
  });

  it('remove is idempotent and only bumps when something changes', () => {
    const r = new InMemorySkillRegistry();
    r.replace([priceCompare, cartSummary]);
    r.remove('price-compare');
    expect(Object.keys(r.get().skills)).toEqual(['cart-summary']);
    const v = r.get().version;
    r.remove('price-compare'); // no-op
    expect(r.get().version).toBe(v);
  });

  it('clear empties + bumps', () => {
    const r = new InMemorySkillRegistry();
    r.replace([priceCompare]);
    r.clear();
    expect(r.get().skills).toEqual({});
  });

  it('bumps version on every mutation', () => {
    const r = new InMemorySkillRegistry();
    r.upsert(priceCompare); expect(r.get().version).toBe('1.0.0');
    r.upsert(cartSummary);  expect(r.get().version).toBe('2.0.0');
    r.remove('price-compare'); expect(r.get().version).toBe('3.0.0');
    r.replace([]); expect(r.get().version).toBe('4.0.0');
  });
});
