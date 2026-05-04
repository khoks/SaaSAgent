/**
 * AnthropicProvider — ModelProvider implementation against @anthropic-ai/sdk.
 *
 * Per ADR-007 + ADR-012: this is the v0 default. Sits behind the ModelProvider
 * interface so swapping to Bedrock / Vertex / Azure later is a contained refactor.
 *
 * Prompt caching: when `system` is provided as a SystemBlock[] with `cache: true`
 * on any block, that block (and everything before it) is wrapped in
 * `cache_control: {type: "ephemeral"}` per the Anthropic prompt-caching contract.
 * Render order is tools → system → messages, so a cache mark on the last system
 * block caches all of system. Min cacheable prefix on Haiku 4.5 is 4096 tokens —
 * shorter prefixes silently won't cache (no error, just zero cache reads).
 */

import Anthropic from '@anthropic-ai/sdk';

import {
  type GenerateRequest,
  type GenerateResponse,
  type ModelProvider,
  ProviderError,
  type SystemBlock,
} from './types.js';

export interface AnthropicProviderOptions {
  /** API key. Defaults to ANTHROPIC_API_KEY env var. */
  apiKey?: string;
  /** Override the SDK client (for testing). */
  client?: Anthropic;
  /** Default max_tokens when caller doesn't specify. */
  defaultMaxTokens?: number;
}

export class AnthropicProvider implements ModelProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;
  private readonly defaultMaxTokens: number;

  constructor(options: AnthropicProviderOptions = {}) {
    this.client = options.client ?? new Anthropic({ apiKey: options.apiKey });
    this.defaultMaxTokens = options.defaultMaxTokens ?? 4096;
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: req.model,
      max_tokens: req.maxTokens ?? this.defaultMaxTokens,
      messages: req.messages.map((m) => ({ role: m.role, content: m.content })),
    };

    if (req.system !== undefined) {
      params.system = serializeSystem(req.system);
    }

    if (req.adaptiveThinking) {
      // Adaptive thinking is supported on Opus 4.6+ and Sonnet 4.6 — caller is
      // responsible for only setting this when targeting a compatible model.
      params.thinking = { type: 'enabled', budget_tokens: 8000 };
    }

    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create(params);
    } catch (err) {
      throw classifyAnthropicError(err);
    }

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      model: response.model,
      stopReason: response.stop_reason ?? 'unknown',
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
        cacheCreationTokens: response.usage.cache_creation_input_tokens ?? undefined,
      },
    };
  }
}

function serializeSystem(
  system: string | SystemBlock[],
): string | Anthropic.TextBlockParam[] {
  if (typeof system === 'string') return system;
  return system.map((block) => {
    const textBlock: Anthropic.TextBlockParam = { type: 'text', text: block.text };
    if (block.cache) {
      textBlock.cache_control = { type: 'ephemeral' };
    }
    return textBlock;
  });
}

function classifyAnthropicError(err: unknown): ProviderError {
  if (err instanceof Anthropic.RateLimitError) {
    return new ProviderError(`Anthropic rate limited: ${err.message}`, err, true);
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return new ProviderError(`Anthropic connection error: ${err.message}`, err, true);
  }
  if (err instanceof Anthropic.InternalServerError) {
    return new ProviderError(`Anthropic server error: ${err.message}`, err, true);
  }
  if (err instanceof Anthropic.APIError) {
    return new ProviderError(`Anthropic API error (${err.status}): ${err.message}`, err, false);
  }
  return new ProviderError(
    `Anthropic call failed: ${err instanceof Error ? err.message : String(err)}`,
    err,
    false,
  );
}
