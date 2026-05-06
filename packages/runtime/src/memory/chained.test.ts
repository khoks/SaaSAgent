import { describe, it, expect, vi } from 'vitest';
import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import { ChainedMemoryProvider } from './chained.js';
import type { MemoryProvider } from './types.js';

function makeMock(name: string, opts: {
  recall?: ReadonlyArray<MemoryRecall>;
  recallThrows?: Error;
  recordThrows?: Error;
} = {}): MemoryProvider & { recordCalls: number } {
  const m = {
    name,
    recordCalls: 0,
    recall: vi.fn(async () => {
      if (opts.recallThrows) throw opts.recallThrows;
      return opts.recall ?? [];
    }),
    record: vi.fn(async () => {
      m.recordCalls += 1;
      if (opts.recordThrows) throw opts.recordThrows;
    }),
  };
  return m as unknown as MemoryProvider & { recordCalls: number };
}

const turn: ConversationTurn = { speaker: 'user', text: 'hi', at: '2026-01-01T00:00:00Z' };

describe('ChainedMemoryProvider', () => {
  it('throws when constructed with zero providers', () => {
    expect(() => new ChainedMemoryProvider([])).toThrow(/at least one/);
  });

  it('reports its name as chained:<a>+<b>', () => {
    const c = new ChainedMemoryProvider([makeMock('a'), makeMock('b')]);
    expect(c.name).toBe('chained:a+b');
  });

  it('recall concatenates results from all providers in order', async () => {
    const c = new ChainedMemoryProvider([
      makeMock('a', { recall: [{ store: 'in-memory', summary: 'a-1' }] }),
      makeMock('b', { recall: [{ store: 'postgres', summary: 'b-1' }] }),
    ]);
    const r = await c.recall({ text: '' });
    expect(r.map((x) => x.summary)).toEqual(['a-1', 'b-1']);
  });

  it('recall dedupes by store+summary', async () => {
    const c = new ChainedMemoryProvider([
      makeMock('a', { recall: [{ store: 'in-memory', summary: 'same' }] }),
      makeMock('b', { recall: [{ store: 'in-memory', summary: 'same' }] }),
    ]);
    const r = await c.recall({ text: '' });
    expect(r).toHaveLength(1);
  });

  it('recall stops once `limit` results have been collected', async () => {
    const c = new ChainedMemoryProvider([
      makeMock('a', {
        recall: [
          { store: 'in-memory', summary: '1' },
          { store: 'in-memory', summary: '2' },
        ],
      }),
      makeMock('b', { recall: [{ store: 'in-memory', summary: '3' }] }),
    ]);
    const r = await c.recall({ text: '', limit: 2 });
    expect(r).toHaveLength(2);
  });

  it('recall skips providers that throw and continues with the rest', async () => {
    const a = makeMock('a', { recallThrows: new Error('a-down') });
    const b = makeMock('b', { recall: [{ store: 'in-memory', summary: 'b-1' }] });
    const c = new ChainedMemoryProvider([a, b]);
    const r = await c.recall({ text: '' });
    expect(r.map((x) => x.summary)).toEqual(['b-1']);
  });

  it('record fans out to every provider in parallel', async () => {
    const a = makeMock('a');
    const b = makeMock('b');
    const c = new ChainedMemoryProvider([a, b]);
    await c.record(turn, 's1');
    expect(a.recordCalls).toBe(1);
    expect(b.recordCalls).toBe(1);
  });

  it('record tolerates partial failure (some providers throw, others succeed)', async () => {
    const a = makeMock('a', { recordThrows: new Error('a-write-fail') });
    const b = makeMock('b');
    const c = new ChainedMemoryProvider([a, b]);
    await expect(c.record(turn)).resolves.toBeUndefined();
    expect(b.recordCalls).toBe(1);
  });

  it('record throws when ALL providers fail', async () => {
    const a = makeMock('a', { recordThrows: new Error('boom-a') });
    const b = makeMock('b', { recordThrows: new Error('boom-b') });
    const c = new ChainedMemoryProvider([a, b]);
    await expect(c.record(turn)).rejects.toThrow(/all providers failed/);
  });
});
