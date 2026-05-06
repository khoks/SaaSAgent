import { describe, it, expect } from 'vitest';
import type { FeatureDescriptor } from '@saasagent/protocol';
import { InMemoryFeatureRegistry } from './features.js';

const productSearch: FeatureDescriptor = {
  name: 'product-search',
  version: '1.0.0',
  summary: 'Search the catalog by category, price, brand, and rating',
  whenRelevant:
    'Use when the user wants to discover products. Filters supported: category, price-range, brand, min-rating.',
  content:
    '# Product Search\n\nThe catalog supports faceted search with the following filters: category, price range, brand, minimum rating.',
};

const checkout: FeatureDescriptor = {
  name: 'checkout',
  version: '1.0.0',
  summary: 'Cart-to-purchase flow including payment + shipping selection',
  whenRelevant: 'Use when the user is ready to purchase, has questions about payment or shipping, or wants to apply a coupon.',
  content: '# Checkout\n\nSupports credit card, PayPal, and Apple Pay. Shipping options: standard, express, overnight.',
};

describe('InMemoryFeatureRegistry', () => {
  it('starts empty at 0.0.0', () => {
    const r = new InMemoryFeatureRegistry();
    expect(r.get()).toEqual({ version: '0.0.0', features: {} });
  });

  it('replace + upsert + remove + clear all bump version', () => {
    const r = new InMemoryFeatureRegistry();
    r.replace([productSearch]);
    expect(r.get().version).toBe('1.0.0');
    r.upsert(checkout);
    expect(r.get().version).toBe('2.0.0');
    r.remove('product-search');
    expect(r.get().version).toBe('3.0.0');
    r.clear();
    expect(r.get().version).toBe('4.0.0');
  });

  it('upsert by name (insert then update)', () => {
    const r = new InMemoryFeatureRegistry();
    r.upsert(productSearch);
    expect(r.get().features['product-search']?.summary).toBe(productSearch.summary);
    r.upsert({ ...productSearch, summary: 'updated summary' });
    expect(r.get().features['product-search']?.summary).toBe('updated summary');
    expect(Object.keys(r.get().features)).toHaveLength(1);
  });

  it('remove of missing key is a no-op (no version bump)', () => {
    const r = new InMemoryFeatureRegistry();
    r.replace([productSearch]);
    const v = r.get().version;
    r.remove('does-not-exist');
    expect(r.get().version).toBe(v);
  });

  it('clear empties the registry', () => {
    const r = new InMemoryFeatureRegistry();
    r.replace([productSearch, checkout]);
    expect(Object.keys(r.get().features)).toHaveLength(2);
    r.clear();
    expect(r.get().features).toEqual({});
  });
});
