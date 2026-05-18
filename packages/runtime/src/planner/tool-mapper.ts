/**
 * tool-mapper — Phase 2.1b.
 *
 * Translates the runtime's two capability registries (Skills + Tools per
 * ADR-021) into Anthropic ToolDefinitions the SonnetPlanner exposes via the
 * tool_use API.
 *
 * Naming: each capability is prefixed with its kind so the planner can route
 * tool_use callbacks back to the right executor without ambiguity:
 *   • `skill__<name>` → SkillExecutor.execute(name, ...)
 *   • `tool__<name>`  → ToolExecutor.execute(name, ...)
 *
 * Both prefixes match Anthropic's tool-name regex (^[a-zA-Z0-9_-]{1,128}$).
 * Names registered with characters OUTSIDE that set (most commonly the dot,
 * as in 'expedia.search-flights') are sanitized via `sanitizeNameSegment()`
 * which replaces each invalid char with '_'. The registered name remains the
 * key in the executor registry; `buildToolNameResolver()` returns a Map from
 * the sanitized qualified form back to the original {kind, registeredName}
 * so the planner's tool_use callback can dispatch correctly.
 *
 * If a descriptor lacks an inputSchema we substitute a permissive
 * `{type:'object', properties:{}}` so the model can still call the tool with
 * arbitrary args (the executor will reject malformed input downstream).
 *
 * Description format: `<descriptor.description>\n\nWhen to use: <whenToUse>`
 * — gives the planner both the one-liner and the multi-sentence guidance the
 * SkillDescriptor / ToolDescriptor capture, in a way the model is trained to
 * read.
 */

import type {
  SkillDescriptor,
  SkillRegistry,
  SubAgentDescriptor,
  SubAgentRegistry,
  ToolDescriptor,
  ToolRegistry,
} from '@saasagent/protocol';

import type { ToolDefinition } from '../model/index.js';

export const SKILL_PREFIX = 'skill__';
export const TOOL_PREFIX = 'tool__';
export const SUBAGENT_PREFIX = 'subagent__';
/** Anthropic accepts tool names matching `^[a-zA-Z0-9_-]{1,128}$`. */
const MAX_NAME_LEN = 128;
const VALID_NAME_CHAR = /[a-zA-Z0-9_-]/;
const VALID_NAME_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

export type ToolKind = 'skill' | 'tool' | 'subagent';

/** Discriminated form returned by parseToolName(). */
export type ParsedToolName = { kind: ToolKind; name: string };

/**
 * Map from sanitized qualified tool name (what the Anthropic API receives and
 * returns in tool_use responses) → original {kind, registeredName}. Built once
 * per plan in `buildToolNameResolver()` and consulted by SonnetPlanner when
 * dispatching tool_use callbacks. Keeps registered names stable (so executors
 * keep their existing keys) while letting the API see only API-compliant chars.
 */
export type ToolNameResolver = Map<string, ParsedToolName>;

/**
 * Replace every character outside `[a-zA-Z0-9_-]` with `_`. Pure, deterministic,
 * one-way (no inverse — that's what ToolNameResolver is for).
 *
 * Examples:
 *   'expedia.search-flights' → 'expedia_search-flights'
 *   'foo/bar:baz'           → 'foo_bar_baz'
 *   'already-fine_v1'       → 'already-fine_v1'  (no-op)
 */
export function sanitizeNameSegment(name: string): string {
  let out = '';
  for (const ch of name) {
    out += VALID_NAME_CHAR.test(ch) ? ch : '_';
  }
  return out;
}

/**
 * Build a qualified tool name for a capability. Sanitizes the name segment so
 * the result always matches Anthropic's `^[a-zA-Z0-9_-]{1,128}$` regex, even
 * when the registered name contains otherwise-valid identifier characters
 * (e.g. dots, slashes, colons) that the API rejects.
 *
 * Throws only if the SANITIZED qualified name exceeds the 128-char ceiling —
 * sanitization itself never fails (every input maps to a valid output of
 * equal length).
 */
export function qualifyToolName(kind: ToolKind, name: string): string {
  const prefix =
    kind === 'skill' ? SKILL_PREFIX : kind === 'tool' ? TOOL_PREFIX : SUBAGENT_PREFIX;
  const qualified = prefix + sanitizeNameSegment(name);
  if (qualified.length > MAX_NAME_LEN) {
    throw new Error(
      `Qualified tool name "${qualified}" exceeds Anthropic's ${MAX_NAME_LEN}-char tool-name limit`,
    );
  }
  return qualified;
}

/**
 * Best-effort inverse of qualifyToolName(). Strips the kind prefix and returns
 * the (sanitized) name segment as `parsed.name`. NOTE: this returns the
 * SANITIZED name, which may not equal the original registered name when the
 * registered name contained chars outside `[a-zA-Z0-9_-]`. Use
 * `buildToolNameResolver()` instead when you need the original registered name
 * for executor dispatch.
 */
export function parseToolName(qualified: string): ParsedToolName | null {
  if (qualified.startsWith(SUBAGENT_PREFIX)) {
    return { kind: 'subagent', name: qualified.slice(SUBAGENT_PREFIX.length) };
  }
  if (qualified.startsWith(SKILL_PREFIX)) {
    return { kind: 'skill', name: qualified.slice(SKILL_PREFIX.length) };
  }
  if (qualified.startsWith(TOOL_PREFIX)) {
    return { kind: 'tool', name: qualified.slice(TOOL_PREFIX.length) };
  }
  return null;
}

/**
 * Validate a single qualified name against the Anthropic regex. Used in tests
 * and as an assertion at descriptorsToTools() output; the regex is the
 * source-of-truth contract with the API.
 */
export function isApiValidToolName(qualified: string): boolean {
  return VALID_NAME_PATTERN.test(qualified);
}

const PERMISSIVE_OBJECT_SCHEMA = {
  type: 'object' as const,
  properties: {},
};

const SUBAGENT_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: {
    intent: { type: 'string', description: 'Natural-language intent to delegate to the sub-agent' },
    payload: { type: 'object', description: 'Optional structured payload — sub-agent validates against its inputSchema' },
  },
  required: ['intent'],
};

function descriptorToTool(
  kind: ToolKind,
  d: SkillDescriptor | ToolDescriptor | SubAgentDescriptor,
): ToolDefinition {
  // Sub-agents always present a uniform { intent, payload? } interface to the
  // parent planner — the actual sub-agent's input schema is its concern.
  const input_schema =
    kind === 'subagent'
      ? SUBAGENT_INPUT_SCHEMA
      : ((d as SkillDescriptor | ToolDescriptor).inputSchema as ToolDefinition['input_schema'] | undefined) ??
        PERMISSIVE_OBJECT_SCHEMA;
  return {
    name: qualifyToolName(kind, d.name),
    description: `${d.description}\n\nWhen to use: ${d.whenToUse}`,
    input_schema,
  };
}

/**
 * Convert all three capability registries into ToolDefinition[] suitable for
 * the Anthropic tool_use API. Order: skills, tools, sub-agents (alphabetical
 * within each group). Empty registries → empty contribution.
 *
 * Defense-in-depth: after assembly, every emitted name is validated against
 * Anthropic's regex. If any fails (e.g. a future refactor reintroduces a
 * code path that bypasses qualifyToolName), this throws with a clear error
 * naming the offending capability — far easier to debug than the opaque
 * Anthropic 400 the API would otherwise return.
 */
export function descriptorsToTools(
  skills: SkillRegistry,
  tools: ToolRegistry,
  subAgents?: SubAgentRegistry,
): ToolDefinition[] {
  const out: ToolDefinition[] = [];
  for (const name of Object.keys(skills.skills).sort()) {
    const d = skills.skills[name];
    if (d) out.push(descriptorToTool('skill', d));
  }
  for (const name of Object.keys(tools.tools).sort()) {
    const d = tools.tools[name];
    if (d) out.push(descriptorToTool('tool', d));
  }
  if (subAgents) {
    for (const name of Object.keys(subAgents.subAgents).sort()) {
      const d = subAgents.subAgents[name];
      if (d) out.push(descriptorToTool('subagent', d));
    }
  }
  // Final guard. If we ever ship a regression where a tool name slips past
  // sanitization, fail fast with a clear message — not the opaque Anthropic
  // 400 ("tools.0.custom.name: String should match pattern ...").
  for (let i = 0; i < out.length; i++) {
    if (!isApiValidToolName(out[i]!.name)) {
      throw new Error(
        `[tool-mapper] tool[${i}].name "${out[i]!.name}" violates Anthropic's regex ^[a-zA-Z0-9_-]{1,128}$. ` +
          `This indicates a bug in sanitization. Check the registered capability name and report.`,
      );
    }
  }
  return out;
}

/**
 * Build the sanitized-qualified-name → original-registered-name resolver the
 * SonnetPlanner uses when dispatching tool_use callbacks. The Anthropic API
 * sees `skill__expedia_search-flights` (sanitized) but the executor's
 * skillRegistry has `expedia.search-flights` (original). The resolver bridges
 * the two so the planner can dispatch without ambiguity.
 *
 * Collision handling: if two distinct registered names sanitize to the same
 * form (e.g. `foo.bar` and `foo_bar`), a console warning is logged and
 * last-wins. In practice this is rare — most enterprise integrations pick one
 * naming convention.
 */
export function buildToolNameResolver(
  skills: SkillRegistry,
  tools: ToolRegistry,
  subAgents?: SubAgentRegistry,
): ToolNameResolver {
  const resolver: ToolNameResolver = new Map();
  const insert = (kind: ToolKind, name: string): void => {
    const qualified = qualifyToolName(kind, name);
    const existing = resolver.get(qualified);
    if (existing && existing.name !== name) {
      // eslint-disable-next-line no-console
      console.warn(
        `[tool-mapper] sanitized-name collision for ${qualified}: "${existing.name}" and "${name}" both map to the same Anthropic-safe form. Last write wins — pick one canonical name to avoid surprise.`,
      );
    }
    resolver.set(qualified, { kind, name });
  };
  for (const name of Object.keys(skills.skills)) insert('skill', name);
  for (const name of Object.keys(tools.tools)) insert('tool', name);
  if (subAgents) {
    for (const name of Object.keys(subAgents.subAgents)) insert('subagent', name);
  }
  return resolver;
}
