/**
 * Graph module barrel — Phase 5 (ADR-008).
 *
 *   • InMemoryGraphProvider — process-local; default for dev/single-host.
 *   • Neo4jGraphProvider    — runs Cypher against any neo4j-driver-compatible client.
 */

export type {
  RelationshipGraph,
  GraphNode,
  GraphEdge,
  GraphPath,
} from './types.js';
export { InMemoryGraphProvider } from './in-memory.js';
export {
  Neo4jGraphProvider,
  type Neo4jGraphProviderOptions,
  type Neo4jDriver,
  type Neo4jSession,
  type Neo4jRecord,
} from './neo4j.js';
