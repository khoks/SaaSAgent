/**
 * ModelProvider — provider-agnostic interface for foundation-model calls.
 *
 * Per ADR-007: the platform uses Claude Agent SDK / Anthropic at v0, behind
 * a thin internal interface so we can swap to Bedrock / Vertex / Azure-hosted
 * Claude (or other providers entirely) without rippling through composer / planner
 * code. AnthropicProvider is the v0 implementation.
 *
 * Per ADR-012: composer uses Haiku 4.5; planner uses Sonnet 4.6; fallback for
 * novel-intent composition uses Sonnet 4.6 with adaptive thinking.
 */

/** A single message turn passed to the model. */
export interface ModelMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * A system-prompt block. Splitting into multiple blocks lets us mark only the
 * stable suffix as cacheable (per ADR-012's prompt-caching strategy).
 */
export interface SystemBlock {
  text: string;
  /** When true, this block (and everything before it) is marked for prompt caching. */
  cache?: boolean;
}

export interface GenerateRequest {
  /** Model identifier (e.g. "claude-haiku-4-5", "claude-sonnet-4-6"). */
  model: string;
  /** System prompt — string for simple cases, array of blocks when caching. */
  system?: string | SystemBlock[];
  messages: ModelMessage[];
  /** Maximum output tokens. Defaults to 4096 in providers. */
  maxTokens?: number;
  /**
   * Adaptive thinking — only supported on Sonnet 4.6 / Opus 4.6+ per the model
   * catalog. AnthropicProvider sets `thinking: {type: "adaptive"}` when true; sends nothing when false.
   */
  adaptiveThinking?: boolean;
}

export interface GenerateUsage {
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from prompt cache (cheap reads, ~10% of normal cost). */
  cacheReadTokens?: number;
  /** Tokens written to prompt cache (premium writes, ~125% of normal cost). */
  cacheCreationTokens?: number;
}

export interface GenerateResponse {
  text: string;
  model: string;
  stopReason: string;
  usage: GenerateUsage;
}

/**
 * The provider abstraction. Implementations: AnthropicProvider (v0), MockProvider (tests),
 * future BedrockProvider / VertexProvider / AzureProvider.
 */
export interface ModelProvider {
  /** Provider name for logging / observability. */
  readonly name: string;
  generate(req: GenerateRequest): Promise<GenerateResponse>;
}

/** Errors thrown by providers. */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly source?: unknown,
    public readonly retryable: boolean = false,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
