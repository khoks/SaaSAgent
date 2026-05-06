import { describe, it, expect } from 'vitest';
import type { SubAgentDescriptor } from '@saasagent/protocol';
import { InMemorySubAgentRegistry } from './subagents.js';

const travel: SubAgentDescriptor = {
  name: 'travel-specialist',
  version: '1.0.0',
  description: 'Specialist sub-agent for trip booking + flight search',
  whenToUse: 'when the user wants to book travel or compare flights',
  transport: 'http',
  endpoint: 'https://travel-agent.host.com/federate',
};

const billing: SubAgentDescriptor = {
  ...travel,
  name: 'billing-specialist',
  description: 'Specialist sub-agent for invoices + refunds',
  whenToUse: 'when the user has billing questions',
  endpoint: 'https://billing-agent.host.com/federate',
};

describe('InMemorySubAgentRegistry', () => {
  it('starts empty at 0.0.0', () => {
    const r = new InMemorySubAgentRegistry();
    expect(r.get()).toEqual({ version: '0.0.0', subAgents: {} });
  });

  it('replace + upsert + remove + clear all bump version', () => {
    const r = new InMemorySubAgentRegistry();
    r.replace([travel]);
    expect(r.get().version).toBe('1.0.0');
    r.upsert(billing);
    expect(r.get().version).toBe('2.0.0');
    r.remove('travel-specialist');
    expect(r.get().version).toBe('3.0.0');
    r.clear();
    expect(r.get().version).toBe('4.0.0');
  });

  it('upsert by name (insert then update)', () => {
    const r = new InMemorySubAgentRegistry();
    r.upsert(travel);
    expect(r.get().subAgents['travel-specialist']?.endpoint).toBe(travel.endpoint);
    r.upsert({ ...travel, endpoint: 'https://new.travel.host.com/federate' });
    expect(r.get().subAgents['travel-specialist']?.endpoint).toBe(
      'https://new.travel.host.com/federate',
    );
    expect(Object.keys(r.get().subAgents)).toHaveLength(1);
  });

  it('remove of missing key is a no-op (no version bump)', () => {
    const r = new InMemorySubAgentRegistry();
    r.replace([travel]);
    const v = r.get().version;
    r.remove('nope');
    expect(r.get().version).toBe(v);
  });

  it('clear empties the registry', () => {
    const r = new InMemorySubAgentRegistry();
    r.replace([travel, billing]);
    r.clear();
    expect(r.get().subAgents).toEqual({});
  });
});
