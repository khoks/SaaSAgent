import { describe, it, expect } from 'vitest';
import type { AtomicComponent } from '@saasagent/protocol';
import { InMemoryComponentRegistry } from './components.js';

const tile: AtomicComponent = {
  name: 'ProductTile',
  version: '1.0.0',
  framework: 'react',
  semanticRole: 'product summary card',
  whenToUse: 'product listing surfaces',
  propsSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  moduleSpecifier: '@host/components',
  exportName: 'ProductTile',
};

const card: AtomicComponent = {
  ...tile,
  name: 'Card',
  semanticRole: 'generic container',
  whenToUse: 'wrap related content',
};

describe('InMemoryComponentRegistry', () => {
  it('starts empty at version 0.0.0', () => {
    const reg = new InMemoryComponentRegistry();
    expect(reg.get()).toEqual({ version: '0.0.0', components: {} });
  });

  it('replace() sets components and bumps version', () => {
    const reg = new InMemoryComponentRegistry();
    reg.replace([tile, card]);
    const r = reg.get();
    expect(r.version).toBe('1.0.0');
    expect(Object.keys(r.components).sort()).toEqual(['Card', 'ProductTile']);
  });

  it('upsert() inserts then updates by name', () => {
    const reg = new InMemoryComponentRegistry();
    reg.upsert(tile);
    expect(reg.get().components['ProductTile']?.semanticRole).toBe('product summary card');
    reg.upsert({ ...tile, semanticRole: 'updated' });
    expect(reg.get().components['ProductTile']?.semanticRole).toBe('updated');
    expect(Object.keys(reg.get().components)).toHaveLength(1);
  });

  it('remove() removes by name and is idempotent', () => {
    const reg = new InMemoryComponentRegistry();
    reg.replace([tile, card]);
    reg.remove('ProductTile');
    expect(Object.keys(reg.get().components)).toEqual(['Card']);
    const v = reg.get().version;
    reg.remove('ProductTile'); // no-op
    expect(reg.get().version).toBe(v); // version not bumped on no-op
  });

  it('clear() empties the registry', () => {
    const reg = new InMemoryComponentRegistry();
    reg.replace([tile, card]);
    reg.clear();
    expect(reg.get().components).toEqual({});
  });

  it('bumps version on every mutation', () => {
    const reg = new InMemoryComponentRegistry();
    expect(reg.get().version).toBe('0.0.0');
    reg.upsert(tile); expect(reg.get().version).toBe('1.0.0');
    reg.upsert(card); expect(reg.get().version).toBe('2.0.0');
    reg.remove('ProductTile'); expect(reg.get().version).toBe('3.0.0');
    reg.replace([]); expect(reg.get().version).toBe('4.0.0');
  });
});
