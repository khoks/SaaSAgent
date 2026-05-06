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
 *
 * Phase 2.1b: tools + structured content blocks. When `req.tools` is set we pass
 * them through to the SDK; messages with structured content (tool_use, tool_result)
 * are mapped to Anthropic's content-block array shape; the response's content
 * blocks are surfaced both as concatenated text (back-compat) and as the original
 * structured array (so tool-use callers can dispatch tool calls).
 */

import Anthropic from '@anthropic-ai/sdk';

import {
  type GenerateRequest,
  type GenerateResponse,
  type ModelContentBlock,
  type ModelMessage,
  type ModelProvider,
  ProviderError,
  type SystemBlock,
  type ToolDefinition,
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
      messages: req.messages.map(serializeMessage),
    };

    if (req.system !== undefined) {
      params.system = serializeSystem(req.system);
    }

    if (req.tools && req.tools.length > 0) {
      params.tools = req.tools.map(serializeTool);
      if (req.toolChoice) {
        params.tool_choice = serializeToolChoice(req.toolChoice);
      }
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

    const content = response.content.map(deserializeBlock);
    const text = content
      .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
      .map((b) => b.text)
      .join('');

    return {
      text,
      content,
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

function serializeMessage(msg: ModelMessage): Anthropic.MessageParam {
  if (typeof msg.content === 'string') {
    return { role: msg.role, content: msg.content };
  }
  // Structured content (tool_use, tool_result, text). Map each block to the
  // SDK's union type. The cast on tool_use.input is safe — Anthropic accepts
  // any JSON-serializable value as tool input.
  const blocks = msg.content.map<Anthropic.ContentBlockParam>((b) => {
    if (b.type === 'text') {
      return { type: 'text', text: b.text };
    }
    if (b.type === 'tool_use') {
      return {
        type: 'tool_use',
        id: b.id,
        name: b.name,
        input: b.input as Record<string, unknown>,
      };
    }
    // tool_result
    const block: Anthropic.ToolResultBlockParam = {
      type: 'tool_result',
      tool_use_id: b.tool_use_id,
      content: b.content,
    };
    if (b.is_error) block.is_error = true;
    return block;
  });
  return { role: msg.role, content: blocks };
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

function serializeTool(t: ToolDefinition): Anthropic.Tool {
  return {
    name: t.name,
    description: t.description,
    input_schema: t.input_schema as Anthropic.Tool.InputSchema,
  };
}

function serializeToolChoice(
  choice: NonNullable<GenerateRequest['toolChoice']>,
): Anthropic.MessageCreateParams['tool_choice'] {
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'any') return { type: 'any' };
  if (choice === 'none') return { type: 'none' };
  return { type: 'tool', name: choice.name };
}

function deserializeBlock(block: Anthropic.ContentBlock): ModelContentBlock {
  if (block.type === 'text') {
    return { type: 'text', text: block.text };
  }
  if (block.type === 'tool_use') {
    return { type: 'tool_use', id: block.id, name: block.name, input: block.input };
  }
  // Unknown future block types (e.g. server_tool_use, thinking, redacted_thinking)
  // — surface them as text so callers don't crash. The SonnetPlanner ignores
  // non-tool_use blocks anyway.
  return { type: 'text', text: '' };
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
