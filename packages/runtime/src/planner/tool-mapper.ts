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
 * Both prefixes match Anthropic's tool-name regex (^[a-zA-Z0-9_-]{1,64}$).
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
  ToolDescriptor,
  ToolRegistry,
} from '@saasagent/protocol';

import type { ToolDefinition } from '../model/index.js';

export const SKILL_PREFIX = 'skill__';
export const TOOL_PREFIX = 'tool__';
const MAX_NAME_LEN = 64;

/** Discriminated form returned by parseToolName(). */
export type ParsedToolName = { kind: 'skill' | 'tool'; name: string };

/** Build a qualified tool name for a capability. */
export function qualifyToolName(kind: 'skill' | 'tool', name: string): string {
  const qualified = (kind === 'skill' ? SKILL_PREFIX : TOOL_PREFIX) + name;
  if (qualified.length > MAX_NAME_LEN) {
    throw new Error(
      `Qualified tool name "${qualified}" exceeds Anthropic's ${MAX_NAME_LEN}-char tool-name limit`,
    );
  }
  return qualified;
}

/** Inverse of qualifyToolName(). Returns null for unrecognized prefixes. */
export function parseToolName(qualified: string): ParsedToolName | null {
  if (qualified.startsWith(SKILL_PREFIX)) {
    return { kind: 'skill', name: qualified.slice(SKILL_PREFIX.length) };
  }
  if (qualified.startsWith(TOOL_PREFIX)) {
    return { kind: 'tool', name: qualified.slice(TOOL_PREFIX.length) };
  }
  return null;
}

const PERMISSIVE_OBJECT_SCHEMA = {
  type: 'object' as const,
  properties: {},
};

function descriptorToTool(
  kind: 'skill' | 'tool',
  d: SkillDescriptor | ToolDescriptor,
): ToolDefinition {
  return {
    name: qualifyToolName(kind, d.name),
    description: `${d.description}\n\nWhen to use: ${d.whenToUse}`,
    input_schema: (d.inputSchema as ToolDefinition['input_schema'] | undefined) ??
      PERMISSIVE_OBJECT_SCHEMA,
  };
}

/**
 * Convert both registries' contents into a ToolDefinition[] suitable for the
 * Anthropic tool_use API. Order: skills first, then tools (alphabetically
 * within each group). Empty registries → empty array.
 */
export function descriptorsToTools(
  skills: SkillRegistry,
  tools: ToolRegistry,
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
  return out;
}
