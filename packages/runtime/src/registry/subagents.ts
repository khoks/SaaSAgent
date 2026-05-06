/**
 * Sub-Agents registry — Phase 2.4.
 *
 * Same shape as the other five registries (Component / Theme / Skill / Tool /
 * Feature): in-memory, single-tenant, bump-only version. SubAgentExecutor
 * reads the descriptor at execute-time so registry edits are live.
 */

import type { SubAgentDescriptor, SubAgentRegistry } from '@saasagent/protocol';

export interface SubAgentRegistryStore {
  get(): SubAgentRegistry;
  replace(subAgents: ReadonlyArray<SubAgentDescriptor>): SubAgentRegistry;
  upsert(subAgent: SubAgentDescriptor): SubAgentRegistry;
  remove(name: string): SubAgentRegistry;
  clear(): SubAgentRegistry;
}

const EMPTY: SubAgentRegistry = Object.freeze({ version: '0.0.0', subAgents: {} });

function bumpVersion(prev: string): string {
  const major = Number.parseInt(prev.split('.')[0] ?? '0', 10);
  return `${major + 1}.0.0`;
}

export class InMemorySubAgentRegistry implements SubAgentRegistryStore {
  private current: SubAgentRegistry = EMPTY;

  get(): SubAgentRegistry {
    return this.current;
  }

  replace(subAgents: ReadonlyArray<SubAgentDescriptor>): SubAgentRegistry {
    const map: Record<string, SubAgentDescriptor> = {};
    for (const s of subAgents) map[s.name] = s;
    this.current = {
      version: bumpVersion(this.current.version),
      subAgents: Object.freeze(map),
    };
    return this.current;
  }

  upsert(subAgent: SubAgentDescriptor): SubAgentRegistry {
    const map = { ...this.current.subAgents, [subAgent.name]: subAgent };
    this.current = {
      version: bumpVersion(this.current.version),
      subAgents: Object.freeze(map),
    };
    return this.current;
  }

  remove(name: string): SubAgentRegistry {
    if (!(name in this.current.subAgents)) return this.current;
    const map = { ...this.current.subAgents };
    delete map[name];
    this.current = {
      version: bumpVersion(this.current.version),
      subAgents: Object.freeze(map),
    };
    return this.current;
  }

  clear(): SubAgentRegistry {
    this.current = { version: bumpVersion(this.current.version), subAgents: {} };
    return this.current;
  }
}
