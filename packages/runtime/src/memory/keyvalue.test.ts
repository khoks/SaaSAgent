import { describe, it, expect } from 'vitest';
import { KeyValueMemoryProvider } from './keyvalue.js';

const turn = (speaker: 'user' | 'agent', text: string, at = '2026-01-01T00:00:00Z') => ({
  speaker,
  text,
  at,
});

describe('KeyValueMemoryProvider', () => {
  it('reports its name', () => {
    expect(new KeyValueMemoryProvider().name).toBe('keyvalue');
  });

  it('recall is empty before any record', async () => {
    const m = new KeyValueMemoryProvider();
    expect(await m.recall({ text: 'x', sessionId: 's1' })).toEqual([]);
  });

  it('records into the requested session and recalls only from that session', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'hello from s1'), 's1');
    await m.record(turn('user', 'hello from s2'), 's2');

    const r1 = await m.recall({ text: '', sessionId: 's1' });
    const r2 = await m.recall({ text: '', sessionId: 's2' });
    expect(r1).toHaveLength(1);
    expect(r1[0]!.summary).toContain('hello from s1');
    expect(r2).toHaveLength(1);
    expect(r2[0]!.summary).toContain('hello from s2');
  });

  it('falls back to a default session bucket when no sessionId is given', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'no session id given'));
    const r = await m.recall({ text: '' });
    expect(r).toHaveLength(1);
  });

  it('returns the most recent N turns (default 10) in chronological order', async () => {
    const m = new KeyValueMemoryProvider();
    for (let i = 0; i < 15; i++) {
      await m.record(turn('user', `msg ${i}`, `2026-01-01T00:00:${String(i).padStart(2, '0')}Z`), 's1');
    }
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r).toHaveLength(10);
    // Should be msgs 5..14
    expect(r[0]!.summary).toContain('msg 5');
    expect(r[9]!.summary).toContain('msg 14');
  });

  it('respects MemoryQuery.limit', async () => {
    const m = new KeyValueMemoryProvider();
    for (let i = 0; i < 5; i++) {
      await m.record(turn('user', `m${i}`), 's1');
    }
    const r = await m.recall({ text: '', sessionId: 's1', limit: 3 });
    expect(r).toHaveLength(3);
    expect(r[0]!.summary).toContain('m2');
    expect(r[2]!.summary).toContain('m4');
  });

  it('caps storage at maxPerSession (FIFO eviction)', async () => {
    const m = new KeyValueMemoryProvider({ maxPerSession: 5 });
    for (let i = 0; i < 12; i++) {
      await m.record(turn('user', `t${i}`), 's1');
    }
    const all = m.getSession('s1');
    expect(all).toHaveLength(5);
    expect(all[0]!.text).toBe('t7');
    expect(all[4]!.text).toBe('t11');
  });

  it('emits MemoryRecall with store="in-memory"', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'hi'), 's1');
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r[0]!.store).toBe('in-memory');
  });

  it('truncates long turn text in the summary', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'x'.repeat(500)), 's1');
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r[0]!.summary.length).toBeLessThanOrEqual(280);
    expect(r[0]!.summary.endsWith('…')).toBe(true);
  });

  it('listSessions returns all session keys; clearSession drops one', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'a'), 's1');
    await m.record(turn('user', 'b'), 's2');
    expect([...m.listSessions()].sort()).toEqual(['s1', 's2']);
    expect(m.clearSession('s1')).toBe(true);
    expect(m.clearSession('s1')).toBe(false);
    expect([...m.listSessions()]).toEqual(['s2']);
  });

  it('clearAll wipes everything', async () => {
    const m = new KeyValueMemoryProvider();
    await m.record(turn('user', 'a'), 's1');
    await m.record(turn('user', 'b'), 's2');
    m.clearAll();
    expect([...m.listSessions()]).toEqual([]);
  });
});
