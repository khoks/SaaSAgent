import { describe, it, expect, vi } from 'vitest';
import { InMemoryGraphProvider } from './in-memory.js';
import { Neo4jGraphProvider, type Neo4jDriver } from './neo4j.js';

describe('InMemoryGraphProvider', () => {
  it('reports its name + starts empty', () => {
    const g = new InMemoryGraphProvider();
    expect(g.name).toBe('in-memory');
    expect(g.stats()).toEqual({ nodes: 0, edges: 0 });
  });

  it('upsertNode is idempotent and merges props', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertNode({ label: 'Session', id: 's1', props: { startedAt: '2026-01-01' } });
    await g.upsertNode({ label: 'Session', id: 's1', props: { lastActiveAt: '2026-01-02' } });
    expect(g.stats().nodes).toBe(1);
  });

  it('upsertEdge auto-merges endpoints', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({
      from: { label: 'Session', id: 's1' },
      to: { label: 'Skill', id: 'price-compare' },
      type: 'INVOKED',
    });
    expect(g.stats().nodes).toBe(2);
    expect(g.stats().edges).toBe(1);
  });

  it('upsertEdge is idempotent on (from, to, type)', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({
      from: { label: 'A', id: '1' },
      to: { label: 'B', id: '2' },
      type: 'X',
      props: { count: 1 },
    });
    await g.upsertEdge({
      from: { label: 'A', id: '1' },
      to: { label: 'B', id: '2' },
      type: 'X',
      props: { count: 2 },
    });
    expect(g.stats().edges).toBe(1);
  });

  it('findPaths returns the simple A→B path', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({ from: { label: 'Session', id: 's1' }, to: { label: 'Skill', id: 'k1' }, type: 'INVOKED' });
    const paths = await g.findPaths({
      from: { label: 'Session', id: 's1' },
      to: { label: 'Skill', id: 'k1' },
    });
    expect(paths).toHaveLength(1);
    expect(paths[0]!.nodes).toHaveLength(2);
    expect(paths[0]!.edges).toHaveLength(1);
    expect(paths[0]!.edges[0]!.type).toBe('INVOKED');
  });

  it('findPaths traverses up to maxDepth', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({ from: { label: 'A', id: '1' }, to: { label: 'B', id: '2' }, type: 'X' });
    await g.upsertEdge({ from: { label: 'B', id: '2' }, to: { label: 'C', id: '3' }, type: 'X' });
    const paths = await g.findPaths({
      from: { label: 'A', id: '1' },
      to: { label: 'C', id: '3' },
      maxDepth: 5,
    });
    expect(paths).toHaveLength(1);
    expect(paths[0]!.nodes.map((n) => n.id)).toEqual(['1', '2', '3']);
  });

  it('findPaths respects edgeType filter', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({ from: { label: 'A', id: '1' }, to: { label: 'B', id: '2' }, type: 'X' });
    await g.upsertEdge({ from: { label: 'A', id: '1' }, to: { label: 'B', id: '3' }, type: 'Y' });
    const r = await g.findPaths({ from: { label: 'A', id: '1' }, edgeType: 'X' });
    expect(r).toHaveLength(1);
    expect(r[0]!.edges[0]!.type).toBe('X');
  });

  it('findPaths returns empty when start node missing', async () => {
    const g = new InMemoryGraphProvider();
    const r = await g.findPaths({ from: { label: 'Missing', id: '?' } });
    expect(r).toEqual([]);
  });

  it('findPaths avoids trivial cycles', async () => {
    const g = new InMemoryGraphProvider();
    await g.upsertEdge({ from: { label: 'A', id: '1' }, to: { label: 'B', id: '2' }, type: 'X' });
    await g.upsertEdge({ from: { label: 'B', id: '2' }, to: { label: 'A', id: '1' }, type: 'X' });
    const r = await g.findPaths({ from: { label: 'A', id: '1' }, maxDepth: 4, limit: 100 });
    // Should find A→B path but not A→B→A→B (cycles avoided).
    for (const p of r) {
      const ids = p.nodes.map((n) => `${n.label}:${n.id}`);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('respects limit parameter on findPaths', async () => {
    const g = new InMemoryGraphProvider();
    for (let i = 0; i < 10; i++) {
      await g.upsertEdge({ from: { label: 'Hub', id: 'h' }, to: { label: 'Leaf', id: `${i}` }, type: 'OUT' });
    }
    const r = await g.findPaths({ from: { label: 'Hub', id: 'h' }, limit: 3 });
    expect(r.length).toBeLessThanOrEqual(3);
  });
});

describe('Neo4jGraphProvider', () => {
  function stubDriver(): {
    driver: Neo4jDriver;
    runs: Array<{ cypher: string; params: Record<string, unknown> }>;
  } {
    const runs: Array<{ cypher: string; params: Record<string, unknown> }> = [];
    const driver: Neo4jDriver = {
      session: () => ({
        run: async (cypher: string, params?: Readonly<Record<string, unknown>>) => {
          runs.push({ cypher, params: params ?? {} });
          return { records: [] };
        },
        close: async () => undefined,
      }),
      close: async () => undefined,
    };
    return { driver, runs };
  }

  it('reports its name', () => {
    const { driver } = stubDriver();
    expect(new Neo4jGraphProvider({ driver }).name).toBe('neo4j');
  });

  it('upsertNode emits MERGE Cypher with parameterized id + props', async () => {
    const { driver, runs } = stubDriver();
    const g = new Neo4jGraphProvider({ driver });
    await g.upsertNode({ label: 'Session', id: 's1', props: { startedAt: '2026-01-01' } });
    expect(runs).toHaveLength(1);
    expect(runs[0]!.cypher).toMatch(/MERGE \(n:Session \{ id: \$id \}\)/);
    expect(runs[0]!.params).toEqual({ id: 's1', props: { startedAt: '2026-01-01' } });
  });

  it('upsertEdge emits double-MERGE + relationship MERGE', async () => {
    const { driver, runs } = stubDriver();
    const g = new Neo4jGraphProvider({ driver });
    await g.upsertEdge({
      from: { label: 'Session', id: 's1' },
      to: { label: 'Skill', id: 'k1' },
      type: 'INVOKED',
      props: { at: '2026-01-01' },
    });
    expect(runs[0]!.cypher).toMatch(/MERGE \(a:Session \{ id: \$aid \}\)/);
    expect(runs[0]!.cypher).toMatch(/MERGE \(b:Skill \{ id: \$bid \}\)/);
    expect(runs[0]!.cypher).toMatch(/MERGE \(a\)-\[r:INVOKED\]->\(b\)/);
    expect(runs[0]!.params).toMatchObject({ aid: 's1', bid: 'k1' });
  });

  it('refuses Cypher injection in label / edge type', async () => {
    const { driver } = stubDriver();
    const g = new Neo4jGraphProvider({ driver });
    await expect(
      g.upsertNode({ label: 'A; DROP DATABASE', id: 'x' }),
    ).rejects.toThrow(/Invalid Cypher/);
    await expect(
      g.upsertEdge({ from: { label: 'A', id: '1' }, to: { label: 'B', id: '2' }, type: 'NICE; SHUTDOWN' }),
    ).rejects.toThrow(/Invalid Cypher/);
  });

  it('findPaths emits MATCH p=...-[*1..N]->... RETURN p', async () => {
    const { driver, runs } = stubDriver();
    const g = new Neo4jGraphProvider({ driver });
    await g.findPaths({
      from: { label: 'Session', id: 's1' },
      to: { label: 'Outcome', id: 'completed' },
      edgeType: 'RESULTED_IN',
      maxDepth: 4,
      limit: 5,
    });
    expect(runs[0]!.cypher).toMatch(/MATCH p = \(a:Session \{ id: \$aid \}\)-\[:RESULTED_IN\*1\.\.4\]->\(b:Outcome \{ id: \$tid \}\)/);
    expect(runs[0]!.params).toMatchObject({ aid: 's1', tid: 'completed', limit: 5 });
  });

  it('close() invokes driver.close()', async () => {
    const closeSpy = vi.fn(async () => undefined);
    const driver: Neo4jDriver = {
      session: () => ({ run: async () => ({ records: [] }) }),
      close: closeSpy,
    };
    const g = new Neo4jGraphProvider({ driver });
    await g.close();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
