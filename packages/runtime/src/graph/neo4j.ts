/**
 * Neo4jGraphProvider — Phase 5 (ADR-008) production implementation.
 *
 * Same interface as InMemoryGraphProvider. Hosts pass any neo4j-driver-compatible
 * `Driver` (or any object exposing `session()` returning something with `run()`).
 *
 * Cypher generation:
 *   • upsertNode  → MERGE (n:`Label` {id: $id}) SET n += $props
 *   • upsertEdge  → MATCH (a:`A` {id: $aid}), (b:`B` {id: $bid})
 *                   MERGE (a)-[r:`TYPE`]->(b) SET r += $props
 *   • findPaths   → MATCH p = (a:`A` {id: $aid})-[*1..$depth]->(b:`B` {id: $bid})
 *                   RETURN p LIMIT $limit
 *
 * Label / type names are validated against `^[A-Za-z_][A-Za-z0-9_]*$` since
 * Cypher doesn't allow parameterized labels — preventing injection at the
 * boundary.
 */

import type { GraphEdge, GraphNode, GraphPath, RelationshipGraph } from './types.js';

/** Minimal driver shape — session() returning something with run(). */
export interface Neo4jDriver {
  session(args?: { defaultAccessMode?: string }): Neo4jSession;
  close?(): Promise<void>;
}

export interface Neo4jSession {
  run<T = unknown>(
    cypher: string,
    params?: Readonly<Record<string, unknown>>,
  ): Promise<{ records: Array<Neo4jRecord<T>> }>;
  close?(): Promise<void>;
}

export interface Neo4jRecord<_T = unknown> {
  /** Get a column by name. */
  get(name: string): unknown;
}

export interface Neo4jGraphProviderOptions {
  driver: Neo4jDriver;
}

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
function safeIdent(s: string, kind: string): string {
  if (!IDENT_RE.test(s)) {
    throw new Error(`Invalid Cypher ${kind} identifier: ${s}`);
  }
  return s;
}

export class Neo4jGraphProvider implements RelationshipGraph {
  readonly name = 'neo4j';
  private readonly driver: Neo4jDriver;

  constructor(opts: Neo4jGraphProviderOptions) {
    this.driver = opts.driver;
  }

  private async run<T>(cypher: string, params: Record<string, unknown>): Promise<Array<Neo4jRecord<T>>> {
    const session = this.driver.session();
    try {
      const res = await session.run<T>(cypher, params);
      return res.records;
    } finally {
      await session.close?.();
    }
  }

  async upsertNode(node: GraphNode): Promise<void> {
    const label = safeIdent(node.label, 'node label');
    await this.run(
      `MERGE (n:${label} { id: $id })
       SET n += $props`,
      { id: node.id, props: node.props ?? {} },
    );
  }

  async upsertEdge(edge: GraphEdge): Promise<void> {
    const fromLabel = safeIdent(edge.from.label, 'edge from-label');
    const toLabel = safeIdent(edge.to.label, 'edge to-label');
    const type = safeIdent(edge.type, 'edge type');
    await this.run(
      `MERGE (a:${fromLabel} { id: $aid })
       MERGE (b:${toLabel} { id: $bid })
       MERGE (a)-[r:${type}]->(b)
       SET r += $props`,
      { aid: edge.from.id, bid: edge.to.id, props: edge.props ?? {} },
    );
  }

  async findPaths(args: {
    from: { label: string; id: string };
    to?: { label: string; id: string };
    edgeType?: string;
    maxDepth?: number;
    limit?: number;
  }): Promise<ReadonlyArray<GraphPath>> {
    const fromLabel = safeIdent(args.from.label, 'from label');
    const maxDepth = args.maxDepth ?? 3;
    const limit = args.limit ?? 10;

    const edgeFilter = args.edgeType ? `:${safeIdent(args.edgeType, 'edge type')}` : '';
    const toClause = args.to
      ? `(b:${safeIdent(args.to.label, 'to label')} { id: $tid })`
      : '(b)';
    const cypher = `
      MATCH p = (a:${fromLabel} { id: $aid })-[${edgeFilter}*1..${maxDepth}]->${toClause}
      RETURN p
      LIMIT toInteger($limit)
    `;
    const params: Record<string, unknown> = { aid: args.from.id, limit };
    if (args.to) params.tid = args.to.id;
    const records = await this.run(cypher, params);

    // The driver returns `p` as a Path object — we coerce to GraphPath. The exact
    // shape varies between neo4j-driver versions; for MVP we trust the driver's
    // toObject()-like interface. Hosts can wrap their driver if shape differs.
    return records.map((r) => {
      const p = r.get('p') as { segments?: Array<{ start: { labels: string[]; properties: { id: string } & Record<string, unknown> }; relationship: { type: string; properties: Record<string, unknown> }; end: { labels: string[]; properties: { id: string } & Record<string, unknown> } }> };
      const nodes: GraphNode[] = [];
      const edges: GraphEdge[] = [];
      const segs = p.segments ?? [];
      if (segs.length === 0) {
        return { nodes, edges };
      }
      // Push the start node of the path.
      const first = segs[0]!;
      nodes.push({
        id: String(first.start.properties.id),
        label: first.start.labels[0] ?? 'Unknown',
        props: stripIdProp(first.start.properties),
      });
      for (const seg of segs) {
        nodes.push({
          id: String(seg.end.properties.id),
          label: seg.end.labels[0] ?? 'Unknown',
          props: stripIdProp(seg.end.properties),
        });
        edges.push({
          from: { label: seg.start.labels[0] ?? 'Unknown', id: String(seg.start.properties.id) },
          to: { label: seg.end.labels[0] ?? 'Unknown', id: String(seg.end.properties.id) },
          type: seg.relationship.type,
          props: stripIdProp(seg.relationship.properties),
        });
      }
      return { nodes, edges };
    });
  }

  async close(): Promise<void> {
    await this.driver.close?.().catch(() => undefined);
  }
}

function stripIdProp(props: Record<string, unknown>): Readonly<Record<string, string | number | boolean | null>> {
  const out: Record<string, string | number | boolean | null> = {};
  for (const [k, v] of Object.entries(props)) {
    if (k === 'id') continue;
    if (v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}
