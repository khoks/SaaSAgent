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
 *
 * Phase 2.1b grew tool_use support: ToolDefinition + structured content blocks
 * (text | tool_use | tool_result) so the SonnetPlanner can run a multi-round
 * tool-use loop. Existing string-content callers (HaikuComposer) are unchanged
 * — `content: string` is still valid on ModelMessage.
 */

/** A tool the model can call (Anthropic tool_use API). */
export interface ToolDefinition {
  /** Tool name. Must match `^[a-zA-Z0-9_-]{1,64}$`. */
  name: string;
  /** Human-readable description the model uses to decide when to call this tool. */
  description: string;
  /** JSON Schema (object type) describing the tool's input arguments. */
  input_schema: {
    type: 'object';
    properties?: Readonly<Record<string, unknown>>;
    required?: ReadonlyArray<string>;
    [k: string]: unknown;
  };
}

/**
 * A structured content block in a model message or response.
 *
 * - `text`        — natural-language text (unchanged from the simple-text path).
 * - `tool_use`    — model is asking to invoke a tool. `id` is the correlation key.
 * - `tool_result` — caller's response to a prior tool_use; matched by `tool_use_id`.
 */
export type ModelContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

/** A single message turn passed to the model. */
export interface ModelMessage {
  role: 'user' | 'assistant';
  /**
   * String for simple text messages (back-compat — all Phase 1.x callers). Array
   * of structured blocks for tool_use conversations (Phase 2.1b SonnetPlanner).
   */
  content: string | ReadonlyArray<ModelContentBlock>;
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
  /**
   * Tool definitions available to the model. When set, the model may emit
   * tool_use content blocks; the caller must execute them and feed back
   * tool_result blocks in the next turn.
   */
  tools?: ReadonlyArray<ToolDefinition>;
  /**
   * Force a tool-use behavior. Default 'auto' = model decides.
   *   • 'any'        — model MUST call at least one tool.
   *   • 'none'       — model MUST NOT call tools (effectively disables them).
   *   • { name }     — model MUST call this specific tool.
   */
  toolChoice?: 'auto' | 'any' | 'none' | { type: 'tool'; name: string };
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
  /**
   * Concatenated text from all `text` content blocks. Always populated for
   * back-compat with simple-text callers (HaikuComposer, etc.). When the model
   * emits only tool_use, this is the empty string.
   */
  text: string;
  /**
   * The full structured content from the model — text and/or tool_use blocks
   * in their original order. Tool-use callers (SonnetPlanner) iterate this to
   * dispatch tool calls; simple-text callers can ignore it.
   */
  content: ReadonlyArray<ModelContentBlock>;
  model: string;
  /** 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence' | 'unknown'. */
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
