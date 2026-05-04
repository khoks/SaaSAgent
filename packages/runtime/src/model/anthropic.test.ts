import { describe, it, expect, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

import { AnthropicProvider } from './anthropic.js';
import { ProviderError } from './types.js';

/**
 * Tests use a stubbed @anthropic-ai/sdk client — no real API calls.
 * Verifies request shape, system-block serialization (caching), and error classification.
 */

function fakeMessage(text: string): Anthropic.Message {
  return {
    id: 'msg_fake',
    type: 'message',
    role: 'assistant',
    model: 'claude-haiku-4-5',
    content: [{ type: 'text', text, citations: null }],
    stop_reason: 'end_turn',
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 20,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      server_tool_use: null,
      service_tier: 'standard',
    },
  };
}

function makeFakeClient(message: Anthropic.Message = fakeMessage('hello')): {
  client: Anthropic;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue(message);
  const client = { messages: { create } } as unknown as Anthropic;
  return { client, create };
}

describe('AnthropicProvider', () => {
  it('passes through model/messages/maxTokens', async () => {
    const { client, create } = makeFakeClient();
    const provider = new AnthropicProvider({ client });
    await provider.generate({
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 256,
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5',
        max_tokens: 256,
        messages: [{ role: 'user', content: 'hi' }],
      }),
    );
  });

  it('serializes string system prompt as a string', async () => {
    const { client, create } = makeFakeClient();
    const provider = new AnthropicProvider({ client });
    await provider.generate({
      model: 'claude-haiku-4-5',
      system: 'You are helpful.',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(create.mock.calls[0]![0].system).toBe('You are helpful.');
  });

  it('serializes SystemBlock[] with cache_control on cache-marked blocks', async () => {
    const { client, create } = makeFakeClient();
    const provider = new AnthropicProvider({ client });
    await provider.generate({
      model: 'claude-haiku-4-5',
      system: [
        { text: 'Stable instructions' },
        { text: 'Stable registry', cache: true },
      ],
      messages: [{ role: 'user', content: 'hi' }],
    });
    const sys = create.mock.calls[0]![0].system;
    expect(sys).toEqual([
      { type: 'text', text: 'Stable instructions' },
      { type: 'text', text: 'Stable registry', cache_control: { type: 'ephemeral' } },
    ]);
  });

  it('extracts text + usage from response', async () => {
    const msg = fakeMessage('hello world');
    msg.usage.cache_read_input_tokens = 4096;
    msg.usage.cache_creation_input_tokens = 0;
    const { client } = makeFakeClient(msg);
    const provider = new AnthropicProvider({ client });
    const res = await provider.generate({
      model: 'claude-haiku-4-5',
      messages: [{ role: 'user', content: 'hi' }],
    });
    expect(res.text).toBe('hello world');
    expect(res.stopReason).toBe('end_turn');
    expect(res.usage.inputTokens).toBe(100);
    expect(res.usage.outputTokens).toBe(20);
    expect(res.usage.cacheReadTokens).toBe(4096);
  });

  it('wraps unknown errors as non-retryable ProviderError', async () => {
    const create = vi.fn().mockRejectedValue(new Error('connection reset'));
    const client = { messages: { create } } as unknown as Anthropic;
    const provider = new AnthropicProvider({ client });
    const err = await provider
      .generate({ model: 'claude-haiku-4-5', messages: [{ role: 'user', content: 'x' }] })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ProviderError);
    if (err instanceof ProviderError) {
      expect(err.message).toMatch(/connection reset/);
      expect(err.retryable).toBe(false);
    }
  });
});
