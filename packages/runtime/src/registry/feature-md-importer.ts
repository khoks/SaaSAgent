/**
 * .feature.md importer — Phase 2.2.
 *
 * Parses a `.feature.md` document into a FeatureDescriptor. Format:
 *
 *   ---
 *   name: product-search
 *   version: 1.0.0
 *   summary: Search the catalog by category, price, brand
 *   whenRelevant: |
 *     Use when the user wants to discover products. Filters supported:
 *     category, price-range, brand, min-rating.
 *   ownerTeam: discovery
 *   tags: [search, catalog]
 *   ---
 *
 *   # Product Search
 *
 *   ...full Markdown body...
 *
 * The front matter is a minimal YAML subset (key: value, multi-line `|`,
 * inline `[a, b]` arrays) — no full YAML parser dependency needed for MVP.
 *
 * The Markdown body becomes `content`. If the front matter omits a required
 * field (name, summary, whenRelevant), the importer throws.
 */

import type { FeatureDescriptor } from '@saasagent/protocol';

const FRONT_MATTER_RE = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;

export interface FeatureMarkdownImportError extends Error {
  field?: string;
}

export function importFeatureMarkdown(source: string): FeatureDescriptor {
  const match = FRONT_MATTER_RE.exec(source.trim().replace(/\r\n/g, '\n'));
  if (!match) {
    throw mkErr(
      'Feature markdown must start with a YAML front-matter block: --- ... ---',
    );
  }
  const front = parseFrontMatter(match[1]!);
  const content = (match[2] ?? '').trim();

  const name = stringField(front, 'name');
  const summary = stringField(front, 'summary');
  const whenRelevant = stringField(front, 'whenRelevant');
  const version = (front['version'] as string | undefined) ?? '0.0.0';

  const out: FeatureDescriptor = {
    name,
    version,
    summary,
    whenRelevant,
    content,
  };
  const ownerTeam = front['ownerTeam'];
  if (typeof ownerTeam === 'string') out.ownerTeam = ownerTeam;
  const tags = front['tags'];
  if (Array.isArray(tags) && tags.every((t) => typeof t === 'string')) {
    out.tags = tags as string[];
  }
  return out;
}

function stringField(front: Record<string, unknown>, key: string): string {
  const v = front[key];
  if (typeof v !== 'string' || v.trim().length === 0) {
    throw mkErr(`Feature markdown front matter missing required field: "${key}"`, key);
  }
  return v.trim();
}

/**
 * Minimal YAML-ish front-matter parser supporting:
 *   key: value                          → string
 *   key: |                              → multi-line string (next indented lines)
 *     line1
 *     line2
 *   key: [a, b, c]                      → string array (inline)
 *   key: "quoted value with: colons"    → string (quotes stripped)
 *
 * Comments (#) and nested objects are NOT supported. For full YAML support
 * the host can convert .feature.md to JSON and POST a FeatureDescriptor directly.
 */
function parseFrontMatter(raw: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const lines = raw.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (/^\s*$/.test(line) || /^\s*#/.test(line)) {
      i++;
      continue;
    }
    const m = /^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) {
      i++;
      continue;
    }
    const key = m[1]!;
    let valueStr = (m[2] ?? '').trim();

    // Multi-line literal block: key: |
    if (valueStr === '|') {
      i++;
      const collected: string[] = [];
      while (i < lines.length) {
        const next = lines[i]!;
        if (/^[a-zA-Z0-9_-]+\s*:/.test(next) && !/^\s/.test(next)) break;
        collected.push(next.replace(/^\s{2}/, ''));
        i++;
      }
      out[key] = collected.join('\n').trim();
      continue;
    }

    // Inline array: key: [a, b, c]
    if (valueStr.startsWith('[') && valueStr.endsWith(']')) {
      const inner = valueStr.slice(1, -1).trim();
      out[key] = inner.length === 0 ? [] : inner.split(',').map((s) => stripQuotes(s.trim()));
      i++;
      continue;
    }

    // Plain string (with optional quote stripping)
    out[key] = stripQuotes(valueStr);
    i++;
  }
  return out;
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && (s.startsWith('"') || s.startsWith("'"))) {
    const quote = s[0]!;
    if (s.endsWith(quote)) return s.slice(1, -1);
  }
  return s;
}

function mkErr(message: string, field?: string): FeatureMarkdownImportError {
  const e = new Error(message) as FeatureMarkdownImportError;
  if (field) e.field = field;
  return e;
}
