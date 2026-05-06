import { describe, it, expect, vi } from 'vitest';

import { PostgresMemoryProvider, type PgClient } from './postgres.js';

function makeStubClient(): {
  client: PgClient;
  query: ReturnType<typeof vi.fn>;
  rowsBySql: Map<RegExp, unknown[]>;
} {
  const rowsBySql = new Map<RegExp, unknown[]>();
  const query = vi.fn(async (sql: string, _params?: ReadonlyArray<unknown>) => {
    for (const [re, rows] of rowsBySql.entries()) {
      if (re.test(sql)) return { rows };
    }
    // Default — DDL or unmatched DML returns empty.
    return { rows: [] };
  });
  return { client: { query: query as unknown as PgClient['query'] }, query, rowsBySql };
}

describe('PostgresMemoryProvider', () => {
  it('reports its name', () => {
    const { client } = makeStubClient();
    expect(new PostgresMemoryProvider({ client }).name).toBe('postgres');
  });

  it('rejects table names that contain SQL injection vectors', () => {
    const { client } = makeStubClient();
    expect(
      () => new PostgresMemoryProvider({ client, tableName: 'turns; DROP TABLE users; --' }),
    ).toThrow(/Invalid/);
    expect(() => new PostgresMemoryProvider({ client, tableName: '1bad' })).toThrow(/Invalid/);
  });

  it('runs schema DDL on first call (autoMigrate=true default)', async () => {
    const { client, query } = makeStubClient();
    const m = new PostgresMemoryProvider({ client });
    await m.record({ speaker: 'user', text: 'hi', at: '2026-01-01T00:00:00Z' }, 's1');
    // First two calls should be CREATE TABLE + CREATE INDEX, third should be INSERT.
    expect(query.mock.calls[0]![0]).toMatch(/CREATE TABLE IF NOT EXISTS saasagent_turns/);
    expect(query.mock.calls[1]![0]).toMatch(/CREATE INDEX IF NOT EXISTS/);
    expect(query.mock.calls[2]![0]).toMatch(/INSERT INTO saasagent_turns/);
  });

  it('does NOT migrate when autoMigrate=false', async () => {
    const { client, query } = makeStubClient();
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    await m.record({ speaker: 'user', text: 'hi', at: '2026-01-01T00:00:00Z' }, 's1');
    expect(query.mock.calls.length).toBe(1);
    expect(query.mock.calls[0]![0]).toMatch(/INSERT/);
  });

  it('record() writes the right INSERT params', async () => {
    const { client, query } = makeStubClient();
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    await m.record({ speaker: 'agent', text: 'hello world', at: '2026-01-02T03:04:05Z' }, 's-42');
    const insertCall = query.mock.calls.find((c) => /INSERT INTO/.test(c[0] as string))!;
    expect(insertCall[1]).toEqual(['s-42', 'agent', 'hello world', '2026-01-02T03:04:05Z']);
  });

  it('record() uses __default__ session when sessionId is missing', async () => {
    const { client, query } = makeStubClient();
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    await m.record({ speaker: 'user', text: 'x', at: '2026-01-01T00:00:00Z' });
    const insertCall = query.mock.calls.find((c) => /INSERT INTO/.test(c[0] as string))!;
    expect(insertCall[1]![0]).toBe('__default__');
  });

  it('recall() returns chronological MemoryRecall summaries from postgres', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT speaker, text, at[\s\S]*WHERE session_id/i, [
      { speaker: 'agent', text: 'newer', at: '2026-01-02T00:00:00Z' },
      { speaker: 'user', text: 'older', at: '2026-01-01T00:00:00Z' },
    ]);
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    const r = await m.recall({ text: '', sessionId: 's1' });
    // DB returned DESC; provider reverses to chronological for prompt readability.
    expect(r.map((x) => x.summary)).toEqual([
      'user (2026-01-01T00:00:00Z): older',
      'agent (2026-01-02T00:00:00Z): newer',
    ]);
    expect(r[0]!.store).toBe('postgres');
  });

  it('recall() honors MemoryQuery.limit + falls back to defaultRecallLimit', async () => {
    const { client, query, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT speaker/i, []);
    const m = new PostgresMemoryProvider({ client, defaultRecallLimit: 25, autoMigrate: false });

    await m.recall({ text: '', sessionId: 's1' });
    const lastCall = query.mock.calls[query.mock.calls.length - 1]!;
    expect(lastCall[1]).toEqual(['s1', 25]);

    await m.recall({ text: '', sessionId: 's1', limit: 7 });
    const lastCall2 = query.mock.calls[query.mock.calls.length - 1]!;
    expect(lastCall2[1]).toEqual(['s1', 7]);
  });

  it('listSessions returns DISTINCT session_id rows', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT DISTINCT session_id/i, [
      { session_id: 'alpha' },
      { session_id: 'beta' },
    ]);
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    const sessions = await m.listSessions();
    expect([...sessions]).toEqual(['alpha', 'beta']);
  });

  it('clearSession returns true when at least one row was deleted', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/DELETE FROM saasagent_turns/i, [{ ct: 3 }]);
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    const ok = await m.clearSession('s1');
    expect(ok).toBe(true);
  });

  it('clearSession returns false when no rows matched', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/DELETE FROM saasagent_turns/i, [{ ct: 0 }]);
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    const ok = await m.clearSession('nope');
    expect(ok).toBe(false);
  });

  it('honors a custom tableName', async () => {
    const { client, query } = makeStubClient();
    const m = new PostgresMemoryProvider({ client, tableName: 'custom_log', autoMigrate: false });
    await m.record({ speaker: 'user', text: 'x', at: '2026-01-01T00:00:00Z' });
    expect(query.mock.calls[0]![0]).toMatch(/INSERT INTO custom_log/);
  });

  it('handles Date objects from drivers (formats as ISO)', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT speaker/i, [
      { speaker: 'user', text: 'tick', at: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    const m = new PostgresMemoryProvider({ client, autoMigrate: false });
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r[0]!.summary).toContain('2026-01-01T00:00:00.000Z');
  });
});
