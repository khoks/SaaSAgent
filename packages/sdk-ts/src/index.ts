/**
 * @saasagent/sdk — Sub-Agent SDK (TypeScript).
 *
 * Per ADR-021, ADR-027, ADR-028, ADR-029: domain teams use this SDK to author
 * sub-agents that federate into the SaaSAgent platform via:
 *   • HTTP REST for admin (registration, health, registry, metadata)
 *   • gRPC bidirectional streaming for runtime (planner ↔ sub-agent invocation)
 *   • Push-on-startup self-registration with the Sub-Agent registry
 *   • mTLS authentication (intranet trust model)
 *
 * Status: Phase 0 (skeleton — registration / federation not yet implemented).
 */

export const VERSION = '0.0.0';

/** Capability descriptor — registered into the platform's Sub-Agent registry. */
export interface SubAgentDescriptor {
  /** Stable identifier (kebab-case, unique per tenant). */
  name: string;
  /** Semantic version. */
  version: string;
  /** Human-readable description (consumed by planner + auto-generated eval — ADR-023). */
  description: string;
  /** Owner team (for accountability and on-call routing). */
  ownerTeam: string;
  /** Capability descriptors — semantic statements of what the sub-agent can do. */
  capabilities: string[];
  /** gRPC endpoint where the runtime can reach this sub-agent. */
  grpcEndpoint: string;
  /** Federation protocol version. */
  protocolVersion: string;
}

export interface RegisterOptions {
  /** Platform admin endpoint (HTTP REST). */
  registryUrl: string;
  /** mTLS client cert path. */
  clientCertPath: string;
  /** mTLS client key path. */
  clientKeyPath: string;
  /** Trusted CA cert path (platform's CA). */
  caCertPath: string;
}

/**
 * Push-register this sub-agent with the platform.
 * Phase 0 stub — real implementation lands in Phase 3.
 */
export async function registerSubAgent(
  _descriptor: SubAgentDescriptor,
  _options: RegisterOptions,
): Promise<void> {
  throw new Error('Not implemented — Phase 0 skeleton (federation lands in Phase 3).');
}
