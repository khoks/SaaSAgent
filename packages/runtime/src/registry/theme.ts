/**
 * ThemeRegistryStore — Phase 1.4.2.
 *
 * Per ADR-025: theme & branding tokens are stored in W3C Design Tokens (DTCG)
 * canonical form. Single-tenant in-memory MVP, mirroring the
 * ComponentRegistryStore pattern. Style Dictionary importer + CSS variable
 * fallback land in 1.4.2.x; this layer accepts DTCG-shaped input directly.
 */

import type { DTCGTokenGroup, ThemeRegistration } from '@saasagent/protocol';

export interface ThemeRegistryStore {
  /** Get the active theme. Defaults to a built-in empty theme on cold start. */
  get(): ThemeRegistration;
  /** Replace the entire theme. Bumps version. */
  replace(theme: { name: string; description?: string; tokens: DTCGTokenGroup }): ThemeRegistration;
  /** Reset to the empty default. */
  clear(): ThemeRegistration;
}

const EMPTY: ThemeRegistration = Object.freeze({
  name: 'default',
  version: '0.0.0',
  description: 'Empty theme — host has not registered tokens yet.',
  tokens: Object.freeze({}),
});

function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

export class InMemoryThemeRegistry implements ThemeRegistryStore {
  private current: ThemeRegistration = EMPTY;

  get(): ThemeRegistration {
    return this.current;
  }

  replace(theme: { name: string; description?: string; tokens: DTCGTokenGroup }): ThemeRegistration {
    this.current = {
      name: theme.name,
      version: bumpVersion(this.current.version),
      description: theme.description,
      tokens: theme.tokens,
    };
    return this.current;
  }

  clear(): ThemeRegistration {
    this.current = { ...EMPTY, version: bumpVersion(this.current.version) };
    return this.current;
  }
}

/**
 * Flatten a DTCG token tree into `{path: value}` pairs (path uses dots).
 * Skips `$description` / `$type` / `$extensions` metadata keys.
 * Used by the composer prompt to render a tight summary the LLM can reference.
 */
export function flattenDTCG(group: DTCGTokenGroup): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  walk(group, [], out);
  return out;
}

function walk(
  node: DTCGTokenGroup | unknown,
  path: string[],
  out: Record<string, string | number>,
): void {
  if (node === null || typeof node !== 'object') return;
  const obj = node as Record<string, unknown>;
  // Token leaf?
  if ('$value' in obj) {
    const value = obj['$value'];
    if (typeof value === 'string' || typeof value === 'number') {
      out[path.join('.')] = value;
    } else if (value && typeof value === 'object') {
      // Composite token — store as JSON string for the prompt summary.
      out[path.join('.')] = JSON.stringify(value);
    }
    return;
  }
  for (const [key, val] of Object.entries(obj)) {
    if (key.startsWith('$')) continue; // metadata
    walk(val, [...path, key], out);
  }
}
