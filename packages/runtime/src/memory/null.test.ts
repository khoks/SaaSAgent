import { describe, it, expect } from 'vitest';
import { NullMemoryProvider } from './null.js';

describe('NullMemoryProvider', () => {
  it('reports its name', () => {
    expect(new NullMemoryProvider().name).toBe('null');
  });

  it('recall() returns an empty array regardless of query', async () => {
    const m = new NullMemoryProvider();
    const r1 = await m.recall({ text: 'anything' });
    const r2 = await m.recall({ text: 'something', sessionId: 's1', userId: 'u1', limit: 100 });
    expect(r1).toEqual([]);
    expect(r2).toEqual([]);
  });

  it('record() resolves without throwing for any turn', async () => {
    const m = new NullMemoryProvider();
    await expect(
      m.record({ speaker: 'user', text: 'hello', at: new Date().toISOString() }),
    ).resolves.toBeUndefined();
    await expect(
      m.record({ speaker: 'agent', text: 'hi', at: new Date().toISOString() }),
    ).resolves.toBeUndefined();
  });
});
