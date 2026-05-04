/**
 * HaikuComposer — UIComposer implementation backed by a ModelProvider.
 *
 * Per ADR-012:
 *   - Default composer: claude-haiku-4-5 (fast, cheap, structured-output capable).
 *   - Fallback model on JSON-parse / validation failure: claude-sonnet-4-6 with
 *     adaptive thinking, for the rare novel-intent or recursive-tree case Haiku
 *     can't get right.
 *   - Two cache layers: application-level CompositionCache (canonical-intent keyed)
 *     and Anthropic prompt cache (system-prompt prefix marked with cache_control).
 */

import type {
  ComposeContext,
  ComposedLayout,
  UIComposer,
} from '@saasagent/protocol';

import type { ModelProvider } from '../model/types.js';

import { CompositionCache, canonicalIntent } from './cache.js';
import { parseLayoutNode } from './parse.js';
import { buildComposerSystemPrompt } from './prompt.js';

export interface HaikuComposerOptions {
  provider: ModelProvider;
  /** Composer model. Default: claude-haiku-4-5. */
  composerModel?: string;
  /** Fallback model invoked on parse/validation failure. Default: claude-sonnet-4-6. */
  fallbackModel?: string;
  /** Use adaptive thinking on the fallback model. Default: true. */
  fallbackAdaptiveThinking?: boolean;
  /** Application-level layout cache. Pass an instance to reuse across composers. */
  cache?: CompositionCache;
  /** Default max_tokens. Default: 2048 (layouts are small). */
  maxTokens?: number;
}

export class HaikuComposer implements UIComposer {
  private readonly provider: ModelProvider;
  private readonly composerModel: string;
  private readonly fallbackModel: string;
  private readonly fallbackAdaptiveThinking: boolean;
  private readonly cache: CompositionCache;
  private readonly maxTokens: number;

  constructor(options: HaikuComposerOptions) {
    this.provider = options.provider;
    this.composerModel = options.composerModel ?? 'claude-haiku-4-5';
    this.fallbackModel = options.fallbackModel ?? 'claude-sonnet-4-6';
    this.fallbackAdaptiveThinking = options.fallbackAdaptiveThinking ?? true;
    this.cache = options.cache ?? new CompositionCache();
    this.maxTokens = options.maxTokens ?? 2048;
  }

  async compose(intent: string, context: ComposeContext): Promise<ComposedLayout> {
    // Cache key includes the registry version so a registry change naturally
    // invalidates cached layouts that referenced the old vocabulary.
    const cacheKey = `${context.components.version}::${canonicalIntent(intent)}`;

    const cached = this.cache.get(cacheKey);
    if (cached !== undefined) {
      return {
        ...cached,
        composeCycleId: makeCycleId('cache'),
        composedAt: new Date().toISOString(),
        metadata: { ...(cached.metadata ?? {}), fromCache: true },
      };
    }

    // System prompt is rebuilt per-compose since the registry can change at
    // runtime (REST POST /registry/components). The Anthropic prompt cache
    // still hits as long as the registry version is stable across calls.
    const systemBlocks = buildComposerSystemPrompt(context.components);
    const userPrompt = buildUserPrompt(intent, context);

    // 1. Try Haiku composer first.
    const primary = await this.provider.generate({
      model: this.composerModel,
      system: systemBlocks,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: this.maxTokens,
    });
    const primaryParse = parseLayoutNode(primary.text);
    if (primaryParse.ok) {
      const layout = wrapLayout(primaryParse.node, intent, this.composerModel, false);
      this.cache.set(cacheKey, layout);
      return layout;
    }

    // 2. Fall back to Sonnet (with adaptive thinking) on parse/validation failure.
    const fallback = await this.provider.generate({
      model: this.fallbackModel,
      system: systemBlocks,
      messages: [
        { role: 'user', content: userPrompt },
        {
          role: 'assistant',
          content: primary.text,
        },
        {
          role: 'user',
          content: `That output failed validation: ${primaryParse.reason}\n\nPlease emit a single valid JSON layout-tree object only — no commentary, no fences.`,
        },
      ],
      maxTokens: this.maxTokens,
      adaptiveThinking: this.fallbackAdaptiveThinking,
    });
    const fallbackParse = parseLayoutNode(fallback.text);
    if (fallbackParse.ok) {
      const layout = wrapLayout(fallbackParse.node, intent, this.fallbackModel, false);
      this.cache.set(cacheKey, layout);
      return layout;
    }

    throw new Error(
      `HaikuComposer: both Haiku and Sonnet failed to produce a valid layout. ` +
        `Haiku: ${primaryParse.reason}. Sonnet: ${fallbackParse.reason}.`,
    );
  }
}

function buildUserPrompt(intent: string, context: ComposeContext): string {
  const lines: string[] = [`User intent: ${intent}`];
  if (context.conversationContext.narrative) {
    lines.push('', `Planner narrative (optional context): ${context.conversationContext.narrative}`);
  }
  if (context.conversationContext.recentTurns?.length) {
    lines.push('', 'Recent conversation:');
    for (const turn of context.conversationContext.recentTurns.slice(-4)) {
      lines.push(`  ${turn.speaker}: ${turn.text}`);
    }
  }
  if (context.featureHints?.length) {
    lines.push('', 'Feature hints:', ...context.featureHints.map((h) => `  - ${h}`));
  }
  if (context.mobileContext) {
    lines.push(
      '',
      `Render context: ${context.mobileContext.deviceClass} (viewport ${context.mobileContext.viewportWidth}px, ${context.mobileContext.inputMode} input)`,
    );
  }
  lines.push('', 'Emit a single JSON layout-tree object now.');
  return lines.join('\n');
}

function wrapLayout(
  node: import('@saasagent/protocol').LayoutNode,
  intent: string,
  model: string,
  fromCache: boolean,
): ComposedLayout {
  return {
    composeCycleId: makeCycleId(model),
    composedAt: new Date().toISOString(),
    root: node,
    metadata: {
      intent,
      sources: ['haiku-composer'],
      modelUsed: { composer: model },
      fromCache,
    },
  };
}

function makeCycleId(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
