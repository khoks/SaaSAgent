import { describe, it, expect } from 'vitest';
import type { SkillDescriptor } from '@saasagent/protocol';
import { InMemorySkillRegistry } from '../registry/skills.js';
import { SkillExecutor } from './skill.js';

const inProc: SkillDescriptor = {
  name: 'price-compare',
  version: '1.0.0',
  description: 'Compare prices across two products',
  whenToUse: 'when the user wants to compare two products on price',
  kind: 'in-process',
};

const staticOut: SkillDescriptor = {
  name: 'help-text',
  version: '1.0.0',
  description: 'Returns a fixed help blurb',
  whenToUse: 'when the user asks "what can you do?"',
  kind: 'static-output',
};

const promptTpl: SkillDescriptor = {
  name: 'summarize-thread',
  version: '1.0.0',
  description: 'Summarize a conversation thread',
  whenToUse: 'when the user asks for a recap',
  kind: 'prompt-template',
};

function setup(skills: ReadonlyArray<SkillDescriptor> = []): {
  registry: InMemorySkillRegistry;
  executor: SkillExecutor;
} {
  const registry = new InMemorySkillRegistry();
  if (skills.length > 0) registry.replace(skills);
  const executor = new SkillExecutor({ registry });
  return { registry, executor };
}

describe('SkillExecutor', () => {
  it('returns unknown-skill when no descriptor exists', async () => {
    const { executor } = setup();
    const r = await executor.execute('does-not-exist', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('unknown-skill');
      expect(r.error.message).toMatch(/does-not-exist/);
    }
  });

  it('returns no-handler when descriptor exists but no handler is registered', async () => {
    const { executor } = setup([inProc]);
    const r = await executor.execute('price-compare', { a: 'x', b: 'y' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('no-handler');
      expect(r.error.message).toMatch(/registerHandler/);
    }
  });

  it('invokes a sync handler and returns its output', async () => {
    const { executor } = setup([inProc]);
    executor.registerHandler<{ a: string; b: string }, { winner: string }>(
      'price-compare',
      (input) => ({ winner: input.a }),
    );
    const r = await executor.execute('price-compare', { a: 'tv-55', b: 'tv-65' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output).toEqual({ winner: 'tv-55' });
      expect(typeof r.durationMs).toBe('number');
    }
  });

  it('awaits an async handler', async () => {
    const { executor } = setup([inProc]);
    executor.registerHandler('price-compare', async (input: { a: string }) => {
      await new Promise((r) => setTimeout(r, 5));
      return { echoed: input.a };
    });
    const r = await executor.execute<{ a: string }, { echoed: string }>('price-compare', { a: 'hi' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output.echoed).toBe('hi');
  });

  it('catches handler throws as handler-threw', async () => {
    const { executor } = setup([inProc]);
    executor.registerHandler('price-compare', () => {
      throw new Error('downstream blew up');
    });
    const r = await executor.execute('price-compare', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('handler-threw');
      expect(r.error.message).toBe('downstream blew up');
      expect(r.error.cause).toBeInstanceOf(Error);
    }
  });

  it('catches handler rejections as handler-threw', async () => {
    const { executor } = setup([inProc]);
    executor.registerHandler('price-compare', async () => {
      throw new Error('async boom');
    });
    const r = await executor.execute('price-compare', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('handler-threw');
  });

  it('returns unsupported-kind for prompt-template skills', async () => {
    const { executor } = setup([promptTpl]);
    executor.registerHandler('summarize-thread', () => 'should not be called');
    const r = await executor.execute('summarize-thread', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('unsupported-kind');
      expect(r.error.message).toMatch(/Phase 2\.1/);
    }
  });

  it('treats static-output kind the same as in-process (handler-driven)', async () => {
    const { executor } = setup([staticOut]);
    executor.registerHandler('help-text', () => ({
      lines: ['I can compare products', 'I can find deals'],
    }));
    const r = await executor.execute<unknown, { lines: string[] }>('help-text', {});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output.lines).toHaveLength(2);
  });

  it('hasHandler + unregisterHandler manage handler lifecycle', () => {
    const { executor } = setup();
    expect(executor.hasHandler('x')).toBe(false);
    executor.registerHandler('x', () => null);
    expect(executor.hasHandler('x')).toBe(true);
    expect(executor.unregisterHandler('x')).toBe(true);
    expect(executor.hasHandler('x')).toBe(false);
    expect(executor.unregisterHandler('x')).toBe(false);
  });

  it('passes ExecutionContext through to the handler', async () => {
    const { executor } = setup([inProc]);
    let seen: unknown;
    executor.registerHandler('price-compare', (_input, ctx) => {
      seen = ctx;
      return null;
    });
    await executor.execute('price-compare', {}, { composeCycleId: 'cyc-1', userId: 'u-7' });
    expect(seen).toEqual({ composeCycleId: 'cyc-1', userId: 'u-7' });
  });
});
