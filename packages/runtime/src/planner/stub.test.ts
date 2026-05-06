import { describe, it, expect } from 'vitest';
import type { ConversationContext, InstructionEnvelope } from '@saasagent/protocol';
import { StubPlanner } from './stub.js';

const baseContext: ConversationContext = { intent: 'welcome' };

function envelope(overrides: Partial<InstructionEnvelope>): InstructionEnvelope {
  return {
    composeCycleId: 'cyc-1',
    sourceNodeId: 'node-1',
    emittedAt: new Date().toISOString(),
    type: 'user-message',
    sequence: 0,
    ...overrides,
  };
}

describe('StubPlanner', () => {
  const planner = new StubPlanner();

  it('reports its name', () => {
    expect(planner.name).toBe('stub');
  });

  it('extracts payload.text as intent for user-message envelopes', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: { text: 'show me a TV under 800' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('show me a TV under 800');
    expect(r.invocations).toEqual([]);
  });

  it('trims surrounding whitespace from payload.text', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: { text: '   hello world   ' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('hello world');
  });

  it('falls back to empty-user-message when payload.text is missing', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: {} }),
      context: baseContext,
    });
    expect(r.intent).toBe('empty-user-message');
  });

  it('falls back to empty-user-message when payload is missing', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message' }),
      context: baseContext,
    });
    expect(r.intent).toBe('empty-user-message');
  });

  it('falls back to empty-user-message when payload.text is whitespace-only', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: { text: '   ' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('empty-user-message');
  });

  it('falls back to empty-user-message when payload.text is not a string', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: { text: 42 } }),
      context: baseContext,
    });
    expect(r.intent).toBe('empty-user-message');
  });

  it('preserves envelope.type as intent for action envelopes', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'find-similar-tv', payload: { productId: 'sony-bravia-55' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('find-similar-tv');
    expect(r.invocations).toEqual([]);
  });

  it('preserves envelope.type for non-text payloads on non-user-message types', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'add-to-cart', payload: { productId: 'tv-55', qty: 2 } }),
      context: baseContext,
    });
    expect(r.intent).toBe('add-to-cart');
  });

  it('never produces invocations or narration in the stub', async () => {
    const r = await planner.plan({
      envelope: envelope({ type: 'user-message', payload: { text: 'compare these two' } }),
      context: baseContext,
    });
    expect(r.invocations).toHaveLength(0);
    expect(r.narration).toBeUndefined();
  });
});
