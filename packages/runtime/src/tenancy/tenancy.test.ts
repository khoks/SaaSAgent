import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TENANT,
  tenantScopedSessionId,
  parseScopedSessionId,
  MultiTenantSkillRegistry,
  MultiTenantToolRegistry,
  MultiTenantFeatureRegistry,
  MultiTenantSubAgentRegistry,
} from './index.js';

describe('tenant-scoped sessionId helpers', () => {
  it('scopes a sessionId with tenantId prefix', () => {
    expect(tenantScopedSessionId('acme', 'sess-1')).toBe('acme::sess-1');
  });

  it('uses DEFAULT_TENANT when tenantId is missing', () => {
    expect(tenantScopedSessionId(undefined, 'sess-1')).toBe(`${DEFAULT_TENANT}::sess-1`);
  });

  it('returns just the tenantId when sessionId is missing', () => {
    expect(tenantScopedSessionId('acme', undefined)).toBe('acme');
  });

  it('parseScopedSessionId reverses the scoping', () => {
    expect(parseScopedSessionId('acme::sess-1')).toEqual({ tenantId: 'acme', sessionId: 'sess-1' });
    expect(parseScopedSessionId('acme')).toEqual({ tenantId: 'acme', sessionId: null });
  });
});

describe('MultiTenantSkillRegistry', () => {
  it('isolates registrations per tenant', () => {
    const r = new MultiTenantSkillRegistry();
    r.forTenant('A').replace([
      {
        name: 'skill-a',
        version: '1.0.0',
        description: 'A',
        whenToUse: 'A',
        kind: 'in-process',
      },
    ]);
    r.forTenant('B').replace([
      {
        name: 'skill-b',
        version: '1.0.0',
        description: 'B',
        whenToUse: 'B',
        kind: 'in-process',
      },
    ]);
    const a = r.get('A');
    const b = r.get('B');
    expect(Object.keys(a.skills)).toEqual(['skill-a']);
    expect(Object.keys(b.skills)).toEqual(['skill-b']);
  });

  it('routes missing tenantId to DEFAULT_TENANT', () => {
    const r = new MultiTenantSkillRegistry();
    r.forTenant().upsert({
      name: 'default-skill',
      version: '1.0.0',
      description: 'D',
      whenToUse: 'D',
      kind: 'in-process',
    });
    expect(r.listTenants()).toEqual([DEFAULT_TENANT]);
    expect(Object.keys(r.get(undefined).skills)).toEqual(['default-skill']);
  });

  it('listTenants returns all created tenant ids', () => {
    const r = new MultiTenantSkillRegistry();
    r.forTenant('A').upsert({ name: 'a', version: '1.0.0', description: 'a', whenToUse: 'a', kind: 'in-process' });
    r.forTenant('B').upsert({ name: 'b', version: '1.0.0', description: 'b', whenToUse: 'b', kind: 'in-process' });
    r.forTenant('C').upsert({ name: 'c', version: '1.0.0', description: 'c', whenToUse: 'c', kind: 'in-process' });
    expect([...r.listTenants()].sort()).toEqual(['A', 'B', 'C']);
  });

  it('removeTenant drops a tenant bucket entirely', () => {
    const r = new MultiTenantSkillRegistry();
    r.forTenant('A').upsert({ name: 'x', version: '1.0.0', description: 'x', whenToUse: 'x', kind: 'in-process' });
    expect(r.removeTenant('A')).toBe(true);
    expect(r.listTenants()).toEqual([]);
    expect(r.removeTenant('A')).toBe(false);
  });

  it('totals() aggregates items across tenants', () => {
    const r = new MultiTenantSkillRegistry();
    r.forTenant('A').replace([
      { name: 'a1', version: '1.0.0', description: '', whenToUse: '', kind: 'in-process' },
      { name: 'a2', version: '1.0.0', description: '', whenToUse: '', kind: 'in-process' },
    ]);
    r.forTenant('B').replace([
      { name: 'b1', version: '1.0.0', description: '', whenToUse: '', kind: 'in-process' },
    ]);
    expect(r.totals()).toEqual({ tenants: 2, items: 3 });
  });
});

describe('MultiTenantToolRegistry', () => {
  it('isolates per-tenant tool registrations', () => {
    const r = new MultiTenantToolRegistry();
    r.forTenant('A').upsert({
      name: 'tool-a',
      version: '1.0.0',
      description: '',
      whenToUse: '',
      method: 'GET',
      urlTemplate: 'https://x/{a}',
    });
    r.forTenant('B').upsert({
      name: 'tool-b',
      version: '1.0.0',
      description: '',
      whenToUse: '',
      method: 'GET',
      urlTemplate: 'https://x/{b}',
    });
    expect(Object.keys(r.get('A').tools)).toEqual(['tool-a']);
    expect(Object.keys(r.get('B').tools)).toEqual(['tool-b']);
    expect(r.totals()).toEqual({ tenants: 2, items: 2 });
  });
});

describe('MultiTenantFeatureRegistry', () => {
  it('isolates feature registrations + counts items via totals()', () => {
    const r = new MultiTenantFeatureRegistry();
    r.forTenant('shop').upsert({
      name: 'checkout',
      version: '1.0.0',
      summary: '',
      whenRelevant: '',
      content: '',
    });
    r.forTenant('travel').upsert({
      name: 'multi-leg',
      version: '1.0.0',
      summary: '',
      whenRelevant: '',
      content: '',
    });
    expect(r.totals()).toEqual({ tenants: 2, items: 2 });
  });
});

describe('MultiTenantSubAgentRegistry', () => {
  it('isolates sub-agent registrations', () => {
    const r = new MultiTenantSubAgentRegistry();
    r.forTenant('A').upsert({
      name: 'travel',
      version: '1.0.0',
      description: '',
      whenToUse: '',
      transport: 'http',
      endpoint: 'https://travel.A',
    });
    r.forTenant('B').upsert({
      name: 'billing',
      version: '1.0.0',
      description: '',
      whenToUse: '',
      transport: 'http',
      endpoint: 'https://billing.B',
    });
    expect(Object.keys(r.get('A').subAgents)).toEqual(['travel']);
    expect(Object.keys(r.get('B').subAgents)).toEqual(['billing']);
  });
});
