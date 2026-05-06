/**
 * Sub-Agent federation protocol (Phase 2.4).
 *
 * Per ADR-021's three-tier capability model: Tools (stateless HTTP) and Skills
 * (in-process functions) cover lightweight capabilities. Anything that needs
 * its own runtime, planner, registries, or long-running state graduates to a
 * Sub-Agent — a separate process/service that the parent runtime delegates to
 * over a federation contract.
 *
 * Wire shape (POST <endpoint> from parent → sub-agent):
 *
 *   request:  FederationRequest { intent, payload?, sessionId?, prefetched? }
 *   response: FederationResponse { narration?, output?, invocations?, error? }
 *
 * The parent's SonnetPlanner sees each registered sub-agent as a `subagent__<name>`
 * tool in its tool_use API. When invoked, the SubAgentExecutor POSTs a
 * FederationRequest and parses the response back into the planner's
 * ToolInvocation shape — so sub-agents look identical to skills/tools from the
 * planner's perspective. The composer in Phase 2.1c already handles the
 * resulting ComposedToolInvocation.
 *
 * Sub-agents own their own model + planning + tool execution. The parent only
 * sees their output. This is the federation boundary that lets domain teams
 * ship and version their agents independently per ADR-021.
 */

export type SubAgentTransport =
  /** HTTP POST a JSON FederationRequest to descriptor.endpoint. */
  | 'http'
  /** Reserved — gRPC federation deferred to a later phase. */
  | 'grpc';

export type SubAgentAuthKind =
  | 'none'
  | 'bearer-env'
  | 'host-supplied';

export interface SubAgentDescriptor {
  /** Stable id within the host's registry (kebab-case recommended). */
  name: string;
  /** Semantic version. */
  version: string;
  /** One-line summary the parent planner uses to pick this sub-agent. */
  description: string;
  /** Multi-sentence guidance — when the parent should delegate to this sub-agent. */
  whenToUse: string;
  /** Federation transport. MVP: 'http' only. */
  transport: SubAgentTransport;
  /** Endpoint URL the parent POSTs FederationRequests to. */
  endpoint: string;
  /** Optional static headers attached to every federation request. */
  headers?: Readonly<Record<string, string>>;
  /** Auth strategy. Default 'none'. */
  auth?: SubAgentAuthKind;
  /** When auth='bearer-env', the env var name to read the token from. */
  authEnvVar?: string;
  /** JSON Schema for the sub-agent's input payload (optional — planner will pass freeform if absent). */
  inputSchema?: Readonly<Record<string, unknown>>;
  /** JSON Schema for the sub-agent's output (optional). */
  outputSchema?: Readonly<Record<string, unknown>>;
  /** Default request timeout in milliseconds. Default 15000 (sub-agents may take longer than tools). */
  timeoutMs?: number;
  /** Owner team (the team that operates this sub-agent). */
  ownerTeam?: string;
  /** Tags the planner can match against (e.g. ["travel", "booking"]). */
  tags?: ReadonlyArray<string>;
}

export interface SubAgentRegistry {
  /** Bumped on every mutation. */
  version: string;
  /** Sub-agents keyed by name. */
  subAgents: Readonly<Record<string, SubAgentDescriptor>>;
}

/**
 * Wire envelope sent FROM parent TO sub-agent. The sub-agent runs its own
 * planner against this intent and returns a FederationResponse.
 */
export interface FederationRequest {
  /** What the parent planner wants the sub-agent to do (typically the user's text). */
  intent: string;
  /**
   * Free-form payload the parent planner constructed from its own inputSchema
   * understanding. Sub-agents validate this against their inputSchema.
   */
  payload?: Readonly<Record<string, unknown>>;
  /** Logical session id for memory scoping at the sub-agent. */
  sessionId?: string;
  /** Optional userId for cross-session continuity. */
  userId?: string;
  /**
   * Tool/skill results the parent planner already gathered before delegating.
   * Sub-agents can use these to avoid duplicate lookups.
   */
  prefetched?: ReadonlyArray<{
    name: string;
    kind: 'skill' | 'tool';
    output?: unknown;
  }>;
}

/**
 * Wire envelope returned FROM sub-agent TO parent. The parent's
 * SubAgentExecutor wraps this into the ExecutionResult shape so the planner's
 * tool-call dispatch sees it identically to a skill or tool invocation.
 */
export interface FederationResponse {
  /**
   * Plain-text summary the sub-agent produced (its planner's narration).
   * The parent planner may use this directly or feed it into its own context.
   */
  narration?: string;
  /**
   * Structured data output the parent composer can render. Recommended shape:
   * something matching the sub-agent's outputSchema.
   */
  output?: unknown;
  /**
   * Sub-agent's internal invocations (skills/tools it called) — bubbled up
   * for transparency / observability. Optional.
   */
  invocations?: ReadonlyArray<{
    name: string;
    kind: 'skill' | 'tool' | 'subagent';
    input?: unknown;
    ok: boolean;
    output?: unknown;
    error?: { code: string; message: string };
    durationMs: number;
  }>;
  /** Sub-agent reports a soft failure here; HTTP-level errors come back as ExecutionError instead. */
  error?: { code: string; message: string };
}
