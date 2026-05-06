/**
 * Tool registry protocol (Phase 2.0b).
 *
 * Per ADR-021: Tools are stateless HTTP API calls (or other stateless RPCs)
 * the planner invokes for data fetching or side-effects against the host's
 * existing service surface. Cheapest tier of the three-tier capability model
 * (Tools / Skills / Sub-Agents).
 *
 * MVP scope: registration + planner-consumable metadata. Execution semantics
 * (HTTP fetch with input substitution) arrive in Phase 2.0c.
 */

export type ToolHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ToolAuthKind =
  /** No auth header attached. */
  | 'none'
  /** Bearer token from a runtime-side environment variable. */
  | 'bearer-env'
  /** Bring-your-own (host-provided headers via adapter). */
  | 'host-supplied';

export interface ToolDescriptor {
  /** Stable id within the host's registry (kebab-case recommended). */
  name: string;
  /** Semantic version. */
  version: string;
  /** One-line summary the planner uses to pick this tool over peers. */
  description: string;
  /** Multi-sentence guidance — when the planner should reach for this tool. */
  whenToUse: string;
  /** HTTP method. */
  method: ToolHttpMethod;
  /**
   * URL template. Supports `{path.dot.notation}` substitution from input args.
   * E.g. `"https://api.host.com/products/{productId}"` with input `{productId: "tv-55"}`.
   */
  urlTemplate: string;
  /**
   * Static headers attached to every invocation. Auth headers are not included
   * here — they're computed per the auth kind.
   */
  headers?: Readonly<Record<string, string>>;
  /** Auth strategy. Default: 'none'. */
  auth?: ToolAuthKind;
  /** When auth='bearer-env', the env var name to read the token from at runtime. */
  authEnvVar?: string;
  /** JSON Schema for the tool's input args (used for URL substitution + body). */
  inputSchema?: Readonly<Record<string, unknown>>;
  /** JSON Schema for the parsed response body. */
  outputSchema?: Readonly<Record<string, unknown>>;
  /** Default request timeout in milliseconds. Default: 5000. */
  timeoutMs?: number;
  /** Owner team. */
  ownerTeam?: string;
  /** Tags the planner can match against. */
  tags?: ReadonlyArray<string>;
}

export interface ToolRegistry {
  /** Bumped on every mutation. */
  version: string;
  /** Tools keyed by name. */
  tools: Readonly<Record<string, ToolDescriptor>>;
}
