import { describe, it, expect, vi } from 'vitest';
import { ClickHouseEvalProvider, type ClickHouseClient } from './clickhouse.js';

function makeStubClient(): {
  client: ClickHouseClient;
  query: ReturnType<typeof vi.fn>;
  rowsBySql: Map<RegExp, unknown[]>;
} {
  const rowsBySql = new Map<RegExp, unknown[]>();
  const query = vi.fn(async (sql: string) => {
    for (const [re, rows] of rowsBySql.entries()) {
      if (re.test(sql)) return { rows };
    }
    return { rows: [] };
  });
  return { client: { query: query as unknown as ClickHouseClient['query'] }, query, rowsBySql };
}

describe('ClickHouseEvalProvider', () => {
  it('reports its name', () => {
    const { client } = makeStubClient();
    expect(new ClickHouseEvalProvider({ client }).name).toBe('clickhouse');
  });

  it('rejects malicious table names', () => {
    const { client } = makeStubClient();
    expect(() => new ClickHouseEvalProvider({ client, tableName: 'foo;DROP--' })).toThrow(/Invalid/);
  });

  it('runs CREATE TABLE on first call (autoMigrate=true)', async () => {
    const { client, query } = makeStubClient();
    const p = new ClickHouseEvalProvider({ client });
    await p.record({
      composeCycleId: 'cyc',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    expect(query.mock.calls[0]![0]).toMatch(/CREATE TABLE IF NOT EXISTS saasagent_eval_signals/);
    expect(query.mock.calls[1]![0]).toMatch(/INSERT INTO saasagent_eval_signals/);
  });

  it('record() supplies the right INSERT params', async () => {
    const { client, query } = makeStubClient();
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    await p.record({
      composeCycleId: 'cyc-1',
      sessionId: 's-7',
      userId: 'u-9',
      signal: 'completion',
      source: 'user-explicit',
      score: 0.92,
      comment: 'great',
      intent: 'find a TV',
      at: '2026-01-01T00:00:00Z',
    });
    expect(query.mock.calls[0]![1]).toEqual([
      'cyc-1',
      's-7',
      'u-9',
      'completion',
      'user-explicit',
      0.92,
      'great',
      'find a TV',
      '2026-01-01T00:00:00Z',
    ]);
  });

  it('record() defaults missing optional fields to empty string / null', async () => {
    const { client, query } = makeStubClient();
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    await p.record({
      composeCycleId: 'cyc',
      signal: 'negative',
      source: 'user-implicit',
      at: '2026-01-01T00:00:00Z',
    });
    expect(query.mock.calls[0]![1]).toEqual([
      'cyc',
      '',
      '',
      'negative',
      'user-implicit',
      null,
      '',
      '',
      '2026-01-01T00:00:00Z',
    ]);
  });

  it('query() builds parameterized WHERE clauses for each filter', async () => {
    const { client, query, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT compose_cycle_id/i, []);
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    await p.query({ sessionId: 's1', signal: 'positive', since: '2026-01-01' });
    const sql = query.mock.calls[0]![0] as string;
    const params = query.mock.calls[0]![1] as unknown[];
    expect(sql).toMatch(/session_id = \$1/);
    expect(sql).toMatch(/signal = \$2/);
    expect(sql).toMatch(/at >= parseDateTime64BestEffort\(\$3\)/);
    expect(params.slice(0, 3)).toEqual(['s1', 'positive', '2026-01-01']);
    expect(params[3]).toBe(100); // default limit appended
  });

  it('query() maps rows back to EvalSignal shape', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT compose_cycle_id/i, [
      {
        compose_cycle_id: 'cyc-1',
        session_id: 's1',
        user_id: 'u1',
        signal: 'positive',
        source: 'user-explicit',
        score: 0.8,
        comment: 'great',
        intent: 'check weather',
        at: '2026-01-01T00:00:00Z',
      },
    ]);
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    const r = await p.query({});
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      composeCycleId: 'cyc-1',
      sessionId: 's1',
      userId: 'u1',
      signal: 'positive',
      source: 'user-explicit',
      score: 0.8,
      comment: 'great',
      intent: 'check weather',
      at: '2026-01-01T00:00:00Z',
    });
  });

  it('query() handles missing optional columns gracefully', async () => {
    const { client, rowsBySql } = makeStubClient();
    rowsBySql.set(/SELECT compose_cycle_id/i, [
      {
        compose_cycle_id: 'c',
        session_id: '',
        user_id: '',
        signal: 'neutral',
        source: 'system',
        score: null,
        comment: '',
        intent: '',
        at: '2026-01-01T00:00:00Z',
      },
    ]);
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    const r = await p.query({});
    expect(r[0]!.sessionId).toBeUndefined();
    expect(r[0]!.userId).toBeUndefined();
    expect(r[0]!.score).toBeUndefined();
    expect(r[0]!.comment).toBeUndefined();
  });

  it('count() reflects record() invocations', async () => {
    const { client } = makeStubClient();
    const p = new ClickHouseEvalProvider({ client, autoMigrate: false });
    expect(p.count()).toBe(0);
    await p.record({ composeCycleId: 'a', signal: 'positive', source: 'user-explicit', at: '2026-01-01T00:00:00Z' });
    await p.record({ composeCycleId: 'b', signal: 'negative', source: 'user-implicit', at: '2026-01-01T00:00:01Z' });
    expect(p.count()).toBe(2);
  });
});
