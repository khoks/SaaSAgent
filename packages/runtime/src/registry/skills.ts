/**
 * Skills registry — Phase 2.0b.
 *
 * Storage-only at this slice (registration, retrieval, REST CRUD). Execution
 * (SkillExecutor) arrives in Phase 2.0c alongside the planner that invokes them.
 *
 * Same shape as ComponentRegistryStore / ThemeRegistryStore: in-memory,
 * single-tenant, bump-only version.
 */

import type { SkillDescriptor, SkillRegistry } from '@saasagent/protocol';

export interface SkillRegistryStore {
  get(): SkillRegistry;
  replace(skills: ReadonlyArray<SkillDescriptor>): SkillRegistry;
  upsert(skill: SkillDescriptor): SkillRegistry;
  remove(name: string): SkillRegistry;
  clear(): SkillRegistry;
}

const EMPTY: SkillRegistry = Object.freeze({ version: '0.0.0', skills: {} });

function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

export class InMemorySkillRegistry implements SkillRegistryStore {
  private current: SkillRegistry = EMPTY;

  get(): SkillRegistry {
    return this.current;
  }

  replace(skills: ReadonlyArray<SkillDescriptor>): SkillRegistry {
    const map: Record<string, SkillDescriptor> = {};
    for (const s of skills) map[s.name] = s;
    this.current = { version: bumpVersion(this.current.version), skills: Object.freeze(map) };
    return this.current;
  }

  upsert(skill: SkillDescriptor): SkillRegistry {
    const map = { ...this.current.skills, [skill.name]: skill };
    this.current = { version: bumpVersion(this.current.version), skills: Object.freeze(map) };
    return this.current;
  }

  remove(name: string): SkillRegistry {
    if (!(name in this.current.skills)) return this.current;
    const map = { ...this.current.skills };
    delete map[name];
    this.current = { version: bumpVersion(this.current.version), skills: Object.freeze(map) };
    return this.current;
  }

  clear(): SkillRegistry {
    this.current = { version: bumpVersion(this.current.version), skills: {} };
    return this.current;
  }
}
