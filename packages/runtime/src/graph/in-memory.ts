/**
 * InMemoryGraphProvider — process-local relationship graph.
 *
 * Same interface as Neo4jGraphProvider so production swap is a constructor
 * change. Backed by Maps keyed by `${label}::${id}`. findPaths does BFS up
 * to maxDepth; simple but correct for MVP single-host scale.
 */

import type {
  GraphEdge,
  GraphNode,
  GraphPath,
  RelationshipGraph,
} from './types.js';

const key = (label: string, id: string): string => `${label}::${id}`;

export class InMemoryGraphProvider implements RelationshipGraph {
  readonly name = 'in-memory';
  private readonly nodes = new Map<string, GraphNode>();
  /** Outbound adjacency — `${label}::${id}` → list of edges leaving it. */
  private readonly outgoing = new Map<string, GraphEdge[]>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async upsertNode(node: GraphNode): Promise<void> {
    const k = key(node.label, node.id);
    const existing = this.nodes.get(k);
    if (existing) {
      this.nodes.set(k, {
        ...existing,
        props: { ...(existing.props ?? {}), ...(node.props ?? {}) },
      });
    } else {
      this.nodes.set(k, { ...node });
    }
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async upsertEdge(edge: GraphEdge): Promise<void> {
    // Auto-merge endpoints (Cypher MERGE semantics).
    const fk = key(edge.from.label, edge.from.id);
    const tk = key(edge.to.label, edge.to.id);
    if (!this.nodes.has(fk)) this.nodes.set(fk, { id: edge.from.id, label: edge.from.label });
    if (!this.nodes.has(tk)) this.nodes.set(tk, { id: edge.to.id, label: edge.to.label });
    const list = this.outgoing.get(fk) ?? [];
    // Upsert: replace existing edge of same (to, type), else append.
    const idx = list.findIndex(
      (e) => e.to.label === edge.to.label && e.to.id === edge.to.id && e.type === edge.type,
    );
    if (idx >= 0) {
      list[idx] = { ...list[idx]!, props: { ...(list[idx]!.props ?? {}), ...(edge.props ?? {}) } };
    } else {
      list.push({ ...edge });
    }
    this.outgoing.set(fk, list);
  }

  async findPaths(args: {
    from: { label: string; id: string };
    to?: { label: string; id: string };
    edgeType?: string;
    maxDepth?: number;
    limit?: number;
  }): Promise<ReadonlyArray<GraphPath>> {
    const maxDepth = args.maxDepth ?? 3;
    const limit = args.limit ?? 10;
    const startKey = key(args.from.label, args.from.id);
    const startNode = this.nodes.get(startKey);
    if (!startNode) return [];
    const wantsKey = args.to ? key(args.to.label, args.to.id) : null;

    const out: GraphPath[] = [];
    const stack: Array<{ nodeKey: string; nodes: GraphNode[]; edges: GraphEdge[]; depth: number }> = [
      { nodeKey: startKey, nodes: [startNode], edges: [], depth: 0 },
    ];

    while (stack.length > 0 && out.length < limit) {
      const cur = stack.pop()!;
      // Match-found gate: when caller specified `to`, only collect paths that end there.
      if (wantsKey === null) {
        // No target: collect all paths up to maxDepth that have edges.
        if (cur.edges.length > 0) out.push({ nodes: cur.nodes, edges: cur.edges });
      } else if (cur.nodeKey === wantsKey) {
        if (cur.edges.length > 0) out.push({ nodes: cur.nodes, edges: cur.edges });
        continue;
      }
      if (cur.depth >= maxDepth) continue;
      const adj = this.outgoing.get(cur.nodeKey) ?? [];
      for (const e of adj) {
        if (args.edgeType && e.type !== args.edgeType) continue;
        const nextKey = key(e.to.label, e.to.id);
        const nextNode = this.nodes.get(nextKey);
        if (!nextNode) continue;
        // Avoid trivial cycles.
        if (cur.nodes.some((n) => n.label === nextNode.label && n.id === nextNode.id)) continue;
        stack.push({
          nodeKey: nextKey,
          nodes: [...cur.nodes, nextNode],
          edges: [...cur.edges, e],
          depth: cur.depth + 1,
        });
        await Promise.resolve(); // yield occasionally so big graphs don't starve the event loop
      }
    }
    return out;
  }

  /** Inspection helper — total nodes + total edges. */
  stats(): { nodes: number; edges: number } {
    let edges = 0;
    for (const list of this.outgoing.values()) edges += list.length;
    return { nodes: this.nodes.size, edges };
  }
}
