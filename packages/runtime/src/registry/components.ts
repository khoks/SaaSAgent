/**
 * AtomicComponentRegistry storage — Phase 1.4.1.
 *
 * Per ADR-005 + ADR-009: the runtime holds a registry of the host's atomic UI
 * primitives. Hosts register components via the REST API; the composer reads
 * the active registry on every compose to build its prompt.
 *
 * MVP scope: in-memory single-tenant store. Hot-reload comes for free since
 * the registry is just a TS object that the composer re-reads on every call.
 * Multi-tenant + persistence land when (a) we move beyond single-tenant per
 * deployment per ADR-006 (we don't, by design), or (b) we need restart
 * survival of a registered registry (we will — track for v1).
 */

import type { AtomicComponent, AtomicComponentRegistry } from '@saasagent/protocol';

export interface ComponentRegistryStore {
  /** Get the current registry. Empty registry has version "0.0.0" and no components. */
  get(): AtomicComponentRegistry;
  /** Replace the entire registry. Bumps version. */
  replace(components: ReadonlyArray<AtomicComponent>): AtomicComponentRegistry;
  /** Insert or update one component by name. Bumps version. */
  upsert(component: AtomicComponent): AtomicComponentRegistry;
  /** Remove a component by name. No-op if not present. Bumps version. */
  remove(name: string): AtomicComponentRegistry;
  /** Reset to empty. Bumps version. */
  clear(): AtomicComponentRegistry;
}

/** Bump-only version string. Format: "<n>.0.0" where n increments on every mutation. */
function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

const EMPTY: AtomicComponentRegistry = Object.freeze({ version: '0.0.0', components: {} });

export class InMemoryComponentRegistry implements ComponentRegistryStore {
  private current: AtomicComponentRegistry = EMPTY;

  get(): AtomicComponentRegistry {
    return this.current;
  }

  replace(components: ReadonlyArray<AtomicComponent>): AtomicComponentRegistry {
    const map: Record<string, AtomicComponent> = {};
    for (const c of components) map[c.name] = c;
    this.current = {
      version: bumpVersion(this.current.version),
      components: Object.freeze(map),
    };
    return this.current;
  }

  upsert(component: AtomicComponent): AtomicComponentRegistry {
    const map = { ...this.current.components, [component.name]: component };
    this.current = {
      version: bumpVersion(this.current.version),
      components: Object.freeze(map),
    };
    return this.current;
  }

  remove(name: string): AtomicComponentRegistry {
    if (!(name in this.current.components)) return this.current;
    const map = { ...this.current.components };
    delete map[name];
    this.current = {
      version: bumpVersion(this.current.version),
      components: Object.freeze(map),
    };
    return this.current;
  }

  clear(): AtomicComponentRegistry {
    this.current = { version: bumpVersion(this.current.version), components: {} };
    return this.current;
  }
}
