/**
 * Skill registry protocol (Phase 2.0b).
 *
 * Per ADR-021: Skills are lightweight in-process capabilities — JSON-defined
 * behavior, in-process functions, or short prompts that the planner can invoke
 * inline. Heavier capabilities that need their own runtime, state, or planning
 * are Sub-Agents (separate registry, federated via SDK + gRPC). Tools are the
 * stateless HTTP-API tier.
 *
 * MVP scope: registration + planner-consumable metadata (`description`,
 * `whenToUse`, schemas). Execution semantics arrive in Phase 2.0c when the
 * runtime grows a SkillExecutor.
 */

export type SkillExecutionKind =
  /** In-process JS/TS function reference, registered by the runtime at startup. */
  | 'in-process'
  /** Short prompt template the runtime renders + sends to the planner / a small model. */
  | 'prompt-template'
  /** Pre-baked typed-JSON layout (no LLM call); useful for canned canned responses. */
  | 'static-output';

export interface SkillDescriptor {
  /** Stable id within the host's registry (kebab-case recommended). */
  name: string;
  /** Semantic version. */
  version: string;
  /** One-line summary the planner uses to pick this skill over peers. */
  description: string;
  /** Multi-sentence guidance — when the planner should reach for this skill. */
  whenToUse: string;
  /** Execution kind — informs the runtime's invocation path. */
  kind: SkillExecutionKind;
  /** JSON Schema for the skill's input. */
  inputSchema?: Readonly<Record<string, unknown>>;
  /** JSON Schema for the skill's output. */
  outputSchema?: Readonly<Record<string, unknown>>;
  /** Owner team (accountability + on-call). */
  ownerTeam?: string;
  /** Tags the planner can match against (e.g. ["product-discovery", "comparison"]). */
  tags?: ReadonlyArray<string>;
}

export interface SkillRegistry {
  /** Bumped on every mutation. */
  version: string;
  /** Skills keyed by name. */
  skills: Readonly<Record<string, SkillDescriptor>>;
}
