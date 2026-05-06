/**
 * Feature registry protocol (Phase 2.2).
 *
 * Per ADR-021's three-tier capability model + the "Features as planner context"
 * idea: Features are narrative `.feature.md` documents that describe a domain
 * capability of the host. Unlike Skills (executable in-process functions) or
 * Tools (HTTP calls), Features don't execute — they're long-form context the
 * planner reads to understand the host's domain when deciding what to do.
 *
 * Example: a host SaaS for travel might register a `multi-leg-trip-planning`
 * feature whose content describes how their booking flow handles connecting
 * flights, layover constraints, baggage rules, etc. When the planner sees
 * "book me from SFO to Tokyo with a stop in Honolulu," it reads that feature
 * to understand the relevant constraints before deciding which tools to call.
 *
 * MVP scope: descriptor + registry. The SonnetPlanner formats feature content
 * into its user message when the registry is non-empty (Phase 2.2e).
 */

export interface FeatureDescriptor {
  /** Stable id within the host's registry (kebab-case recommended). */
  name: string;
  /** Semantic version. */
  version: string;
  /** One-line summary the planner uses to decide if a feature is relevant. */
  summary: string;
  /**
   * Multi-sentence guidance — when this feature applies. The planner reads this
   * alongside the summary to decide whether to consult the full content.
   */
  whenRelevant: string;
  /**
   * Full feature description — typically Markdown sourced from a `.feature.md`
   * file in the host's repo. The planner sees this verbatim in its user message.
   */
  content: string;
  /** Owner team (accountability + on-call). */
  ownerTeam?: string;
  /** Tags the planner can match against (e.g. ["product-discovery", "checkout"]). */
  tags?: ReadonlyArray<string>;
}

export interface FeatureRegistry {
  /** Bumped on every mutation. */
  version: string;
  /** Features keyed by name. */
  features: Readonly<Record<string, FeatureDescriptor>>;
}
