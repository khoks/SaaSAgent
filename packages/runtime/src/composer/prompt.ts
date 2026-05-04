/**
 * System-prompt construction for the UI Composer.
 *
 * Phase 1.4.1: prompt is built from a host-registered AtomicComponentRegistry.
 * If the registry is empty (Phase 1.3 fallback), a small set of placeholder
 * primitives (Card / Heading / Text / Button / List) is used so the platform
 * runs end-to-end before any host registers anything.
 *
 * Output: SystemBlock[] with the stable instruction prefix marked cacheable.
 * The atomic-components section bumps version with the registry, which means
 * the prompt-cache hit window shrinks to the time between registry changes —
 * which is the right tradeoff (you want the cache to invalidate when the
 * vocabulary changes, otherwise the composer would emit stale primitives).
 */

import type { AtomicComponent, AtomicComponentRegistry } from '@saasagent/protocol';

import type { SystemBlock } from '../model/types.js';

const COMPOSER_INSTRUCTIONS = `You are the UI Composer for the SaaSAgent platform.

Your job: given a user intent (and short conversation context), emit a single JSON object describing a UI layout tree the agent shell will render.

The layout tree is a recursive node structure with this shape:

  {
    "id":        "string — short, unique within this tree (e.g. 'root', 'btn-buy')",
    "component": "one of the registered atomic components below",
    "props":     { "...component-specific props..." },
    "children":  [ ...nested layout nodes; optional ],
    "emits":     { "click": { "type": "intent-name", "payload": { ... } } }
  }

Hard rules:
- Output exactly ONE JSON object — no commentary, no code fences, no preamble.
- Use only the listed components. Do not invent new component names.
- Always wrap the tree in a single root container component (Card or the closest equivalent in the registry).
- Every interactive component (Button, Link, etc.) MUST declare an "emits" entry whose "type" describes what the click means (e.g. "acknowledge", "buy", "show-more"). Include any context needed to handle the action in "payload".
- Keep "id" values short, unique within the tree, and stable across re-renders for the same logical node (so the renderer can diff cleanly).
- Match the user's intent faithfully. Be concise — short Text and Button labels.`;

const PLACEHOLDER_COMPONENTS_DOC = `Atomic components available (Phase 1.4 placeholder set; the host's registered design-system registry replaces this once a registry is POSTed via /registry/components):

  Card     { title?: string }       — labelled container; takes children
  Heading  { level: 1|2|3, content: string }
  Text     { content: string }      — paragraph text
  Button   { label: string }        — interactive; declare an "emits.click" entry
  List     { ordered?: boolean }    — bulleted/numbered list; children become items`;

const EXAMPLE_BLOCK = `Example output:

  {
    "id": "root",
    "component": "Card",
    "props": { "title": "Find similar TVs under $800" },
    "children": [
      { "id": "msg", "component": "Text", "props": { "content": "Here are 3 matches based on your viewing history." } },
      {
        "id": "btn-show",
        "component": "Button",
        "props": { "label": "Show me" },
        "emits": { "click": { "type": "show-similar", "payload": { "constraint": "under-800" } } }
      }
    ]
  }`;

/**
 * Build the system prompt as cacheable blocks.
 *
 * Block layout:
 *   1. Stable instruction prefix              ← cache: true (changes only on platform release)
 *   2. Atomic components list (from registry) ← cache: true (changes when registry version bumps)
 *   3. Example block (stable)                 ← cache: true
 *
 * All three blocks are cacheable. Cache cap on Haiku (4096 tokens prefix) means
 * Phase 1.4 prompts will start caching as the registry grows past ~50 components.
 */
export function buildComposerSystemPrompt(registry?: AtomicComponentRegistry): SystemBlock[] {
  const componentsDoc = registry && Object.keys(registry.components).length > 0
    ? renderRegistryAsPromptDoc(registry)
    : PLACEHOLDER_COMPONENTS_DOC;
  return [
    { text: COMPOSER_INSTRUCTIONS, cache: true },
    { text: componentsDoc, cache: true },
    { text: EXAMPLE_BLOCK, cache: true },
  ];
}

function renderRegistryAsPromptDoc(registry: AtomicComponentRegistry): string {
  const lines: string[] = [
    `Atomic components registered by the host (registry version ${registry.version}). Use ONLY these components:`,
    '',
  ];
  const sorted = Object.values(registry.components).sort((a, b) => a.name.localeCompare(b.name));
  for (const c of sorted) {
    lines.push(`  ${c.name}`);
    lines.push(`    role:        ${c.semanticRole}`);
    lines.push(`    when to use: ${c.whenToUse}`);
    const propsHint = renderPropsHint(c);
    if (propsHint) lines.push(`    props:       ${propsHint}`);
    if (c.emits && c.emits.length > 0) {
      lines.push(`    emits:       ${c.emits.join(', ')}`);
    }
    if (c.constraints && c.constraints.length > 0) {
      lines.push(`    constraints: ${c.constraints.join('; ')}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function renderPropsHint(c: AtomicComponent): string | null {
  const schema = c.propsSchema as { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
  if (!schema?.properties) return null;
  const required = new Set(schema.required ?? []);
  const parts: string[] = [];
  for (const [name, def] of Object.entries(schema.properties)) {
    const optMark = required.has(name) ? '' : '?';
    const type = typeof def.type === 'string' ? def.type : 'unknown';
    parts.push(`${name}${optMark}: ${type}`);
  }
  return `{ ${parts.join(', ')} }`;
}
