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
  SubAgentDescriptor,
  SubAgentRegistry,
  ToolDescriptor,
  ToolRegistry,
} from '@saasagent/protocol';

import type { ToolDefinition } from '../model/index.js';

export const SKILL_PREFIX = 'skill__';
export const TOOL_PREFIX = 'tool__';
export const SUBAGENT_PREFIX = 'subagent__';
const MAX_NAME_LEN = 64;

export type ToolKind = 'skill' | 'tool' | 'subagent';

/** Discriminated form returned by parseToolName(). */
export type ParsedToolName = { kind: ToolKind; name: string };

/** Build a qualified tool name for a capability. */
export function qualifyToolName(kind: ToolKind, name: string): string {
  const prefix =
    kind === 'skill' ? SKILL_PREFIX : kind === 'tool' ? TOOL_PREFIX : SUBAGENT_PREFIX;
  const qualified = prefix + name;
  if (qualified.length > MAX_NAME_LEN) {
    throw new Error(
      `Qualified tool name "${qualified}" exceeds Anthropic's ${MAX_NAME_LEN}-char tool-name limit`,
    );
  }
  return qualified;
}

/** Inverse of qualifyToolName(). Returns null for unrecognized prefixes. */
export function parseToolName(qualified: string): ParsedToolName | null {
  // Order matters: subagent__ first since 'subagent' starts with 's' but its
  // prefix is longer than skill__'s. (skill__ would NOT match a subagent__ name
  // anyway since prefixes differ, but explicit ordering is safer.)
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
  return out;
}
