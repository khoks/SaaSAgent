/**
 * RelationshipGraph — Phase 5 (ADR-008).
 *
 * Per ADR-008 the polyglot stack includes Neo4j for relationship-shaped data:
 * customer ↔ session ↔ feature ↔ skill-invocation graph queries that aren't
 * efficient in Postgres or Qdrant.
 *
 * The runtime publishes lightweight relationship updates as nodes + edges:
 *
 *   Node types: Session, User, Intent, Feature, Skill, Tool, SubAgent, Outcome
 *   Edge types: TRIGGERED, USED, BROUGHT, INVOKED, RESULTED_IN
 *
 * Provider interface accepts arbitrary nodes + edges so hosts can extend the
 * vocabulary. Two implementations:
 *
 *   • InMemoryGraphProvider  — Maps under the hood; fine for dev / single-host.
 *   • Neo4jGraphProvider     — runs Cypher against any neo4j-driver-compatible
 *                              client.
 */

export interface GraphNode {
  /** Stable id within (label, id) namespace. */
  id: string;
  /** Node label, e.g. 'Session' / 'Skill' / 'Outcome'. */
  label: string;
  /** Free-form properties — strings, numbers, booleans only (Cypher constraint). */
  props?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface GraphEdge {
  /** Source node {label, id}. */
  from: { label: string; id: string };
  /** Destination node {label, id}. */
  to: { label: string; id: string };
  /** Edge type, e.g. 'INVOKED' / 'TRIGGERED'. Uppercase Cypher convention. */
  type: string;
  /** Free-form properties. */
  props?: Readonly<Record<string, string | number | boolean | null>>;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface RelationshipGraph {
  readonly name: string;
  /** Idempotent upsert of one node (MERGE in Cypher terms). */
  upsertNode(node: GraphNode): Promise<void>;
  /** Idempotent edge — both endpoints must exist (or be merged inline). */
  upsertEdge(edge: GraphEdge): Promise<void>;
  /**
   * Find paths between two nodes up to maxDepth. For MVP we surface only
   * the canonical "did session X interact with feature Y" path.
   */
  findPaths(args: {
    from: { label: string; id: string };
    to?: { label: string; id: string };
    edgeType?: string;
    maxDepth?: number;
    limit?: number;
  }): Promise<ReadonlyArray<GraphPath>>;
  /** Optional: tear down driver session. */
  close?(): Promise<void>;
}
