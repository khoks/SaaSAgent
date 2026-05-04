import { describe, it, expect } from 'vitest';
import type { ComposedLayout } from '@saasagent/protocol';
import { CompositionCache, canonicalIntent } from './cache.js';

function fakeLayout(id: string): ComposedLayout {
  return {
    composeCycleId: `cycle-${id}`,
    composedAt: '2026-05-08T00:00:00Z',
    root: { id: 'root', component: 'Card', props: { title: id } },
  };
}

describe('canonicalIntent', () => {
  it('lowercases and collapses whitespace', () => {
    expect(canonicalIntent('  Find  similar TVs ')).toBe('find similar tvs');
  });
});

describe('CompositionCache', () => {
  it('returns undefined on miss', () => {
    const c = new CompositionCache();
    expect(c.get('x')).toBeUndefined();
  });

  it('returns the cached layout on hit', () => {
    const c = new CompositionCache();
    c.set('intent-a', fakeLayout('a'));
    expect(c.get('intent-a')?.composeCycleId).toBe('cycle-a');
  });

  it('evicts the least-recently-used entry when over capacity', () => {
    const c = new CompositionCache({ maxEntries: 2 });
    c.set('a', fakeLayout('a'));
    c.set('b', fakeLayout('b'));
    c.get('a'); // touches a → b is now LRU
    c.set('c', fakeLayout('c')); // evicts b
    expect(c.get('a')).toBeDefined();
    expect(c.get('b')).toBeUndefined();
    expect(c.get('c')).toBeDefined();
  });

  it('clear() empties the cache', () => {
    const c = new CompositionCache();
    c.set('a', fakeLayout('a'));
    c.clear();
    expect(c.size).toBe(0);
  });
});
