import { describe, it, expect } from 'vitest';
import type { ToolDescriptor } from '@saasagent/protocol';
import { InMemoryToolRegistry } from './tools.js';

const getProduct: ToolDescriptor = {
  name: 'get-product',
  version: '1.0.0',
  description: 'Fetch product details from the host catalog',
  whenToUse: 'when the planner needs product details for composing a tile or comparison',
  method: 'GET',
  urlTemplate: 'https://api.host.com/products/{productId}',
  inputSchema: { type: 'object', properties: { productId: { type: 'string' } }, required: ['productId'] },
};

const addToCart: ToolDescriptor = {
  ...getProduct,
  name: 'add-to-cart',
  method: 'POST',
  urlTemplate: 'https://api.host.com/cart',
  description: 'Add an item to the user\'s cart',
  whenToUse: 'when the user wants to buy a product',
};

describe('InMemoryToolRegistry', () => {
  it('starts empty at 0.0.0', () => {
    const r = new InMemoryToolRegistry();
    expect(r.get()).toEqual({ version: '0.0.0', tools: {} });
  });

  it('replace + upsert + remove + clear all bump version', () => {
    const r = new InMemoryToolRegistry();
    r.replace([getProduct]);
    expect(r.get().version).toBe('1.0.0');
    r.upsert(addToCart);
    expect(r.get().version).toBe('2.0.0');
    r.remove('get-product');
    expect(r.get().version).toBe('3.0.0');
    r.clear();
    expect(r.get().version).toBe('4.0.0');
  });

  it('upsert by name (insert then update)', () => {
    const r = new InMemoryToolRegistry();
    r.upsert(getProduct);
    expect(r.get().tools['get-product']?.urlTemplate).toBe('https://api.host.com/products/{productId}');
    r.upsert({ ...getProduct, urlTemplate: 'https://api2.host.com/products/{productId}' });
    expect(r.get().tools['get-product']?.urlTemplate).toBe('https://api2.host.com/products/{productId}');
    expect(Object.keys(r.get().tools)).toHaveLength(1);
  });

  it('remove of missing key is a no-op (no version bump)', () => {
    const r = new InMemoryToolRegistry();
    r.replace([getProduct]);
    const v = r.get().version;
    r.remove('does-not-exist');
    expect(r.get().version).toBe(v);
  });
});
