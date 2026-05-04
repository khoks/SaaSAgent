/**
 * Parse and validate a model-emitted JSON layout tree against the LayoutNode contract.
 *
 * Per ADR-012: the recursive shape of LayoutNode rules out Anthropic strict
 * structured outputs; we use raw JSON output steered by the system prompt and
 * validate at parse time with Zod. On failure we return a typed error so the
 * caller can choose to retry or fall back.
 */

import { z } from 'zod';
import type { LayoutNode } from '@saasagent/protocol';

/**
 * Recursive Zod schema for LayoutNode. Declared as `ZodTypeAny` because Zod's
 * inferred type for `.record()` doesn't narrow to LayoutNode's typed unions
 * (`DataSource`, `EmitSpec`); we cast at the parse boundary instead. The actual
 * structural validation runs as expected.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const LayoutNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    component: z.string().min(1),
    props: z.record(z.unknown()).optional(),
    dataWiring: z.record(z.unknown()).optional(),
    children: z.array(LayoutNodeSchema).optional(),
    slots: z.record(z.array(LayoutNodeSchema)).optional(),
    emits: z
      .record(
        z.object({
          type: z.string().min(1),
          payload: z.record(z.unknown()).optional(),
          debounceMs: z.number().int().nonnegative().optional(),
        }),
      )
      .optional(),
    theme: z.record(z.union([z.string(), z.number()])).optional(),
  }),
);

export type ParseLayoutResult =
  | { ok: true; node: LayoutNode }
  | { ok: false; reason: string; raw: string };

/**
 * Extract the first balanced JSON object from `text` and validate it as a LayoutNode.
 * Tolerates leading/trailing whitespace + accidental code fences.
 */
export function parseLayoutNode(text: string): ParseLayoutResult {
  const json = extractFirstJsonObject(text);
  if (json === null) {
    return { ok: false, reason: 'No JSON object found in model output.', raw: text };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (err) {
    return {
      ok: false,
      reason: `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`,
      raw: text,
    };
  }

  const result = LayoutNodeSchema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: `Schema validation failed: ${result.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`,
      raw: text,
    };
  }
  return { ok: true, node: result.data as LayoutNode };
}

/**
 * Pull the first balanced `{...}` JSON object out of a string, stripping
 * surrounding markdown code fences if present. Returns null when no candidate
 * is found.
 */
function extractFirstJsonObject(text: string): string | null {
  const stripped = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/m, '$1').trim();
  const start = stripped.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i]!;
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return stripped.slice(start, i + 1);
      }
    }
  }
  return null;
}
