/**
 * Features registry — Phase 2.2.
 *
 * Same shape as ComponentRegistryStore / ThemeRegistryStore / SkillRegistryStore /
 * ToolRegistryStore: in-memory, single-tenant, bump-only version. The
 * SonnetPlanner reads this on every plan() to populate its user-message
 * "Domain features" section.
 */

import type { FeatureDescriptor, FeatureRegistry } from '@saasagent/protocol';

export interface FeatureRegistryStore {
  get(): FeatureRegistry;
  replace(features: ReadonlyArray<FeatureDescriptor>): FeatureRegistry;
  upsert(feature: FeatureDescriptor): FeatureRegistry;
  remove(name: string): FeatureRegistry;
  clear(): FeatureRegistry;
}

const EMPTY: FeatureRegistry = Object.freeze({ version: '0.0.0', features: {} });

function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

export class InMemoryFeatureRegistry implements FeatureRegistryStore {
  private current: FeatureRegistry = EMPTY;

  get(): FeatureRegistry {
    return this.current;
  }

  replace(features: ReadonlyArray<FeatureDescriptor>): FeatureRegistry {
    const map: Record<string, FeatureDescriptor> = {};
    for (const f of features) map[f.name] = f;
    this.current = {
      version: bumpVersion(this.current.version),
      features: Object.freeze(map),
    };
    return this.current;
  }

  upsert(feature: FeatureDescriptor): FeatureRegistry {
    const map = { ...this.current.features, [feature.name]: feature };
    this.current = {
      version: bumpVersion(this.current.version),
      features: Object.freeze(map),
    };
    return this.current;
  }

  remove(name: string): FeatureRegistry {
    if (!(name in this.current.features)) return this.current;
    const map = { ...this.current.features };
    delete map[name];
    this.current = {
      version: bumpVersion(this.current.version),
      features: Object.freeze(map),
    };
    return this.current;
  }

  clear(): FeatureRegistry {
    this.current = { version: bumpVersion(this.current.version), features: {} };
    return this.current;
  }
}
