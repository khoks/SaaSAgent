/**
 * CSS variables → DTCG token converter.
 *
 * Per ADR-025 + future-requirements: lowest-friction path for hosts that publish a CSS
 * variable theme but haven't adopted DTCG or Style Dictionary. Parse the `:root { --x: y }`
 * declarations and convert to a DTCG nested group, using single-hyphen as the nesting
 * separator (`--color-brand-primary` → color.brand.primary).
 *
 * Caveats (degraded path per ADR-025):
 *   - Single hyphen as nesting separator means `--color-brand-primary` and
 *     `--color-brand-secondary` correctly nest under `color.brand`, but token names that
 *     contain a literal hyphen (rare) collide with nesting. Production hosts with token
 *     names like that should use DTCG or SD format directly.
 *   - We don't resolve `var(--x)` references — those values pass through verbatim. Hosts
 *     that need reference resolution should resolve at compile time before posting.
 *   - Selectors other than `:root` and `*` are accepted; declarations from any selector
 *     are flattened into one DTCG tree.
 */

import type { DTCGTokenGroup } from '@saasagent/protocol';

import { inferType } from './sd-importer.js';

/** Parse a CSS source string and return a DTCG token tree. */
export function importCssVariables(css: string): DTCGTokenGroup {
  if (typeof css !== 'string' || css.length === 0) return {};
  const stripped = stripComments(css);
  const out: DTCGTokenGroup = {};
  for (const decl of extractCustomPropertyDeclarations(stripped)) {
    insertAtPath(out, parseTokenPath(decl.name), decl.value);
  }
  return out;
}

function stripComments(css: string): string {
  // Remove /* … */ comments (non-greedy, supports newlines).
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

interface Decl { name: string; value: string }

/**
 * Extract `--name: value;` declarations from anywhere in the stripped CSS.
 * Tolerates multiple selectors, nested-feeling syntax, and extra whitespace.
 */
function extractCustomPropertyDeclarations(css: string): Decl[] {
  const out: Decl[] = [];
  const re = /--([a-zA-Z0-9-_]+)\s*:\s*([^;}]+?)\s*(?:;|$|(?=\s*[}]))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const name = m[1]!;
    const value = m[2]!.trim();
    if (name.length > 0 && value.length > 0) {
      out.push({ name, value });
    }
  }
  return out;
}

/** "color-brand-primary" → ["color", "brand", "primary"] */
function parseTokenPath(name: string): string[] {
  return name.split('-').filter((s) => s.length > 0);
}

/** Insert `{$value, $type?}` at `path` in `tree`, creating intermediate groups as needed. */
function insertAtPath(tree: DTCGTokenGroup, path: string[], value: string): void {
  if (path.length === 0) return;
  let node: DTCGTokenGroup = tree;
  for (let i = 0; i < path.length - 1; i++) {
    const seg = path[i]!;
    const existing = node[seg];
    if (!isPlainGroup(existing)) {
      const fresh: DTCGTokenGroup = {};
      node[seg] = fresh;
      node = fresh;
    } else {
      node = existing;
    }
  }
  const leaf: { $value: string; $type?: string } = { $value: value };
  const t = inferType(value);
  if (t !== undefined) leaf.$type = t;
  node[path[path.length - 1]!] = leaf as never;
}

function isPlainGroup(x: unknown): x is DTCGTokenGroup {
  return typeof x === 'object' && x !== null && !Array.isArray(x) && !('$value' in x);
}
