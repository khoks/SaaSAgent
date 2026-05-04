/**
 * Style Dictionary → DTCG token converter.
 *
 * Per ADR-009 + ADR-025 + future-requirements: hosts that already use Style Dictionary
 * (the dominant industry tool for design tokens) can ship their tokens to the runtime
 * without hand-authoring DTCG canonical form. This module performs the conversion.
 *
 * Style Dictionary input shape:
 *   { color: { brand: { primary: { value: "#0071dc", attributes: { category: "color" } } } } }
 *
 * DTCG canonical output shape:
 *   { color: { brand: { primary: { $value: "#0071dc", $type: "color" } } } }
 *
 * Differences:
 *   - SD uses `value`, DTCG uses `$value`
 *   - SD has no required type field; relies on `attributes.category` (deprecated in newer SD
 *     versions) or naming conventions or transforms. We infer $type from the value when
 *     attributes.category is absent.
 *   - SD has `comment` / `attributes` / `original` metadata fields we drop (DTCG has
 *     `$description` / `$extensions`; we map `comment` → `$description`).
 */

import type { DTCGTokenGroup } from '@saasagent/protocol';

/** A Style Dictionary leaf token. */
interface SDLeaf {
  value: unknown;
  comment?: string;
  attributes?: { category?: string; type?: string; [k: string]: unknown };
  [k: string]: unknown;
}

/** Convert a Style Dictionary token tree into DTCG canonical form. */
export function importStyleDictionary(input: unknown): DTCGTokenGroup {
  if (!isPlainObject(input)) return {};
  return convertGroup(input);
}

function convertGroup(group: Record<string, unknown>): DTCGTokenGroup {
  const out: DTCGTokenGroup = {};
  for (const [key, val] of Object.entries(group)) {
    if (!isPlainObject(val)) continue;
    if (isLeaf(val)) {
      out[key] = convertLeaf(val);
    } else {
      out[key] = convertGroup(val);
    }
  }
  return out;
}

function isLeaf(node: Record<string, unknown>): node is SDLeaf {
  return 'value' in node;
}

function convertLeaf(leaf: SDLeaf): { $value: unknown; $type?: string; $description?: string } {
  const out: { $value: unknown; $type?: string; $description?: string } = {
    $value: leaf.value,
  };
  const explicitType = leaf.attributes?.category ?? leaf.attributes?.type;
  const inferred = inferType(leaf.value);
  const $type = (typeof explicitType === 'string' ? explicitType : undefined) ?? inferred;
  if ($type !== undefined) out.$type = $type;
  if (typeof leaf.comment === 'string' && leaf.comment.length > 0) out.$description = leaf.comment;
  return out;
}

/**
 * Infer DTCG $type from a value alone.
 * - "#abc" / "#aabbcc" / "#aabbccdd" → color
 * - "rgb(...)" / "rgba(...)" / "hsl(...)" / "hsla(...)" → color
 * - "<n>px" / "em" / "rem" / "%" / "vw" / "vh" / "ch" → dimension
 * - "<n>ms" / "<n>s" → duration
 * - finite number → number
 * - everything else → undefined (DTCG $type is optional)
 */
export function inferType(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return 'number';
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(v)) return 'color';
  if (/^(rgb|rgba|hsl|hsla)\(/i.test(v)) return 'color';
  if (/^-?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|ch|pt|cm|mm|in|pc)$/i.test(v)) return 'dimension';
  if (/^-?\d*\.?\d+(ms|s)$/i.test(v)) return 'duration';
  return undefined;
}

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
