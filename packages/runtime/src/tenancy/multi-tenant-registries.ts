/**
 * Multi-tenant registry wrappers — Phase 6 (Bucket C.3).
 *
 * Each wrapper owns a Map<tenantId, InMemoryXRegistry> and exposes the same
 * SkillRegistryStore / ToolRegistryStore / FeatureRegistryStore /
 * SubAgentRegistryStore interface plus an explicit `forTenant(tenantId)`
 * accessor. Calls without a tenantId fall back to a DEFAULT_TENANT bucket.
 *
 * The runtime calls `.forTenant(req.tenantId).get()` (etc) on the planner's
 * hot path; admin REST endpoints need a tenantId path segment to address a
 * specific tenant.
 */

import type {
  FeatureDescriptor,
  FeatureRegistry,
  SkillDescriptor,
  SkillRegistry,
  SubAgentDescriptor,
  SubAgentRegistry,
  ToolDescriptor,
  ToolRegistry,
} from '@saasagent/protocol';

import {
  InMemoryFeatureRegistry,
  InMemorySkillRegistry,
  InMemorySubAgentRegistry,
  InMemoryToolRegistry,
  type FeatureRegistryStore,
  type SkillRegistryStore,
  type SubAgentRegistryStore,
  type ToolRegistryStore,
} from '../registry/index.js';

import { DEFAULT_TENANT } from './types.js';

/**
 * Generic factory: build a multi-tenant wrapper around any single-tenant
 * registry constructor. Less duplication; same shape for all four registries.
 */
function buildMultiTenant<TStore, TItem extends { name: string }>(
  factory: () => TStore,
  collectionKey: string,
): {
  forTenant(tenantId: string | undefined): TStore;
  listTenants(): ReadonlyArray<string>;
  removeTenant(tenantId: string): boolean;
  /** Aggregated counts for /health */
  totals(): { tenants: number; items: number };
  _stores: Map<string, TStore>;
} {
  const stores = new Map<string, TStore>();
  return {
    forTenant(tenantId: string | undefined): TStore {
      const id = tenantId ?? DEFAULT_TENANT;
      let s = stores.get(id);
      if (!s) {
        s = factory();
        stores.set(id, s);
      }
      return s;
    },
    listTenants(): ReadonlyArray<string> {
      return [...stores.keys()];
    },
    removeTenant(tenantId: string): boolean {
      return stores.delete(tenantId);
    },
    totals(): { tenants: number; items: number } {
      let items = 0;
      for (const s of stores.values()) {
        const view = (s as { get(): { [k: string]: unknown } }).get();
        const collection = (view as Record<string, unknown>)[collectionKey] as Record<string, unknown> | undefined;
        if (collection) items += Object.keys(collection).length;
      }
      return { tenants: stores.size, items };
    },
    _stores: stores,
  };
}

/** Multi-tenant Skills wrapper. */
export class MultiTenantSkillRegistry {
  private readonly mt = buildMultiTenant<SkillRegistryStore, SkillDescriptor>(
    () => new InMemorySkillRegistry(),
    'skills',
  );

  forTenant(tenantId?: string): SkillRegistryStore {
    return this.mt.forTenant(tenantId);
  }

  /** Returns SkillRegistry seen by the given tenant (or empty default). */
  get(tenantId?: string): SkillRegistry {
    return this.forTenant(tenantId).get();
  }

  listTenants(): ReadonlyArray<string> {
    return this.mt.listTenants();
  }
  removeTenant(tenantId: string): boolean {
    return this.mt.removeTenant(tenantId);
  }
  totals(): { tenants: number; items: number } {
    return this.mt.totals();
  }
}

/** Multi-tenant Tools wrapper. */
export class MultiTenantToolRegistry {
  private readonly mt = buildMultiTenant<ToolRegistryStore, ToolDescriptor>(
    () => new InMemoryToolRegistry(),
    'tools',
  );
  forTenant(tenantId?: string): ToolRegistryStore {
    return this.mt.forTenant(tenantId);
  }
  get(tenantId?: string): ToolRegistry {
    return this.forTenant(tenantId).get();
  }
  listTenants(): ReadonlyArray<string> {
    return this.mt.listTenants();
  }
  removeTenant(tenantId: string): boolean {
    return this.mt.removeTenant(tenantId);
  }
  totals(): { tenants: number; items: number } {
    return this.mt.totals();
  }
}

/** Multi-tenant Features wrapper. */
export class MultiTenantFeatureRegistry {
  private readonly mt = buildMultiTenant<FeatureRegistryStore, FeatureDescriptor>(
    () => new InMemoryFeatureRegistry(),
    'features',
  );
  forTenant(tenantId?: string): FeatureRegistryStore {
    return this.mt.forTenant(tenantId);
  }
  get(tenantId?: string): FeatureRegistry {
    return this.forTenant(tenantId).get();
  }
  listTenants(): ReadonlyArray<string> {
    return this.mt.listTenants();
  }
  removeTenant(tenantId: string): boolean {
    return this.mt.removeTenant(tenantId);
  }
  totals(): { tenants: number; items: number } {
    return this.mt.totals();
  }
}

/** Multi-tenant Sub-Agents wrapper. */
export class MultiTenantSubAgentRegistry {
  private readonly mt = buildMultiTenant<SubAgentRegistryStore, SubAgentDescriptor>(
    () => new InMemorySubAgentRegistry(),
    'subAgents',
  );
  forTenant(tenantId?: string): SubAgentRegistryStore {
    return this.mt.forTenant(tenantId);
  }
  get(tenantId?: string): SubAgentRegistry {
    return this.forTenant(tenantId).get();
  }
  listTenants(): ReadonlyArray<string> {
    return this.mt.listTenants();
  }
  removeTenant(tenantId: string): boolean {
    return this.mt.removeTenant(tenantId);
  }
  totals(): { tenants: number; items: number } {
    return this.mt.totals();
  }
}
