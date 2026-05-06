/**
 * Tools registry — Phase 2.0b.
 *
 * Storage-only at this slice (registration, retrieval, REST CRUD). Execution
 * (HTTP fetch with `{path}` substitution from input args) arrives in Phase 2.0c.
 *
 * Same shape as ComponentRegistryStore / ThemeRegistryStore / SkillRegistryStore.
 */

import type { ToolDescriptor, ToolRegistry } from '@saasagent/protocol';

export interface ToolRegistryStore {
  get(): ToolRegistry;
  replace(tools: ReadonlyArray<ToolDescriptor>): ToolRegistry;
  upsert(tool: ToolDescriptor): ToolRegistry;
  remove(name: string): ToolRegistry;
  clear(): ToolRegistry;
}

const EMPTY: ToolRegistry = Object.freeze({ version: '0.0.0', tools: {} });

function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

export class InMemoryToolRegistry implements ToolRegistryStore {
  private current: ToolRegistry = EMPTY;

  get(): ToolRegistry {
    return this.current;
  }

  replace(tools: ReadonlyArray<ToolDescriptor>): ToolRegistry {
    const map: Record<string, ToolDescriptor> = {};
    for (const t of tools) map[t.name] = t;
    this.current = { version: bumpVersion(this.current.version), tools: Object.freeze(map) };
    return this.current;
  }

  upsert(tool: ToolDescriptor): ToolRegistry {
    const map = { ...this.current.tools, [tool.name]: tool };
    this.current = { version: bumpVersion(this.current.version), tools: Object.freeze(map) };
    return this.current;
  }

  remove(name: string): ToolRegistry {
    if (!(name in this.current.tools)) return this.current;
    const map = { ...this.current.tools };
    delete map[name];
    this.current = { version: bumpVersion(this.current.version), tools: Object.freeze(map) };
    return this.current;
  }

  clear(): ToolRegistry {
    this.current = { version: bumpVersion(this.current.version), tools: {} };
    return this.current;
  }
}
