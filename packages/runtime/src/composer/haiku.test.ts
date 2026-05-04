import { describe, it, expect } from 'vitest';
import type { ComposeContext } from '@saasagent/protocol';

import { MockProvider } from '../model/mock.js';
import { HaikuComposer } from './haiku.js';
import { CompositionCache } from './cache.js';

const ctx: ComposeContext = {
  components: { version: '0.0.0', components: {} },
  theme: { name: 'default', version: '0.0.0', tokens: {} },
  conversationContext: { intent: 'find similar TVs' },
};

const validLayout = JSON.stringify({
  id: 'root',
  component: 'Card',
  props: { title: 'TVs under $800' },
  children: [
    { id: 'msg', component: 'Text', props: { content: 'Here are matches.' } },
    {
      id: 'btn',
      component: 'Button',
      props: { label: 'Show me' },
      emits: { click: { type: 'show', payload: {} } },
    },
  ],
});

describe('HaikuComposer', () => {
  it('returns a parsed ComposedLayout on first-try success', async () => {
    const provider = new MockProvider([validLayout]);
    const composer = new HaikuComposer({ provider });
    const layout = await composer.compose('find similar TVs', ctx);
    expect(layout.root.component).toBe('Card');
    expect(layout.metadata?.intent).toBe('find similar TVs');
    expect(layout.metadata?.modelUsed?.composer).toBe('claude-haiku-4-5');
    expect(layout.metadata?.fromCache).toBe(false);
  });

  it('caches on success and serves the cached layout on repeat (with fresh cycleId)', async () => {
    const provider = new MockProvider([validLayout]);
    const cache = new CompositionCache();
    const composer = new HaikuComposer({ provider, cache });

    const a = await composer.compose('find similar TVs', ctx);
    const b = await composer.compose('Find  Similar TVs', ctx); // canonicalizes to same key

    expect(provider.requests).toHaveLength(1); // only one model call
    expect(b.metadata?.fromCache).toBe(true);
    expect(a.composeCycleId).not.toBe(b.composeCycleId); // fresh cycle id on cache hit
    expect(b.root.component).toBe(a.root.component);
  });

  it('cache key includes registry version so a registry change forces re-compose', async () => {
    const provider = new MockProvider([validLayout, validLayout]);
    const cache = new CompositionCache();
    const composer = new HaikuComposer({ provider, cache });

    await composer.compose('intent', ctx);
    await composer.compose('intent', { ...ctx, components: { version: 'bumped', components: {} } });

    // Two distinct cache keys → two model calls.
    expect(provider.requests).toHaveLength(2);
  });

  it('falls back to Sonnet on parse failure and re-prompts with the error', async () => {
    const provider = new MockProvider([
      'I cannot help with that.', // Haiku junk output
      validLayout,                // Sonnet recovers
    ]);
    const composer = new HaikuComposer({ provider });
    const layout = await composer.compose('novel intent X', ctx);
    expect(layout.metadata?.modelUsed?.composer).toBe('claude-sonnet-4-6');
    expect(provider.requests).toHaveLength(2);

    // Verify the fallback request includes the failed output and an instruction to retry.
    const fallbackReq = provider.requests[1]!;
    expect(fallbackReq.model).toBe('claude-sonnet-4-6');
    expect(fallbackReq.adaptiveThinking).toBe(true);
    expect(fallbackReq.messages.length).toBeGreaterThanOrEqual(3);
    const lastUser = fallbackReq.messages[fallbackReq.messages.length - 1]!;
    expect(lastUser.role).toBe('user');
    expect(lastUser.content).toMatch(/failed validation/);
  });

  it('throws when both composer and fallback fail', async () => {
    const provider = new MockProvider(['no json here', 'still no json']);
    const composer = new HaikuComposer({ provider });
    await expect(composer.compose('intent', ctx)).rejects.toThrow(/both Haiku and Sonnet failed/);
  });

  it('attaches cache_control to the system block (prompt caching)', async () => {
    const provider = new MockProvider([validLayout]);
    const composer = new HaikuComposer({ provider });
    await composer.compose('intent', ctx);
    const sys = provider.requests[0]!.system;
    expect(Array.isArray(sys)).toBe(true);
    if (Array.isArray(sys)) {
      // Last block should be cache: true (Phase 1.3 has only one block, both cacheable).
      expect(sys[sys.length - 1]!.cache).toBe(true);
    }
  });
});
