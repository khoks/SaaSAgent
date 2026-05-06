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
    // Cache key includes both registry versions so a change to either the
    // component vocabulary or the theme naturally invalidates cached layouts.
    const cacheKey = `${context.components.version}::${context.theme.version}::${canonicalIntent(intent)}`;

    // Phase 2.1c: skip cache when the planner invoked tools. Same intent text
    // can produce different UIs depending on what the tools returned (different
    // products, different prices), and re-rendering against fresh data is the
    // safer default than serving a stale layout that points to last-week prices.
    const hasToolResults = (context.toolResults?.length ?? 0) > 0;
    if (!hasToolResults) {
      const cached = this.cache.get(cacheKey);
      if (cached !== undefined) {
        return {
          ...cached,
          composeCycleId: makeCycleId('cache'),
          composedAt: new Date().toISOString(),
          metadata: { ...(cached.metadata ?? {}), fromCache: true },
        };
      }
    }

    // System prompt is rebuilt per-compose since the registry can change at
    // runtime (REST PUT /registry/components or /registry/theme). The Anthropic
    // prompt cache still hits as long as both versions are stable across calls.
    const systemBlocks = buildComposerSystemPrompt(context.components, context.theme);
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
      // Same rationale as the read path: don't write tool-driven layouts to
      // the cache — they're inherently bound to data that may change.
      if (!hasToolResults) this.cache.set(cacheKey, layout);
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
      if (!hasToolResults) this.cache.set(cacheKey, layout);
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
  // Phase 2.1c: when the planner ran tools, render the actual fetched data
  // instead of placeholder text. The composer should fold these values into
  // the layout (Card titles, List items, Heading content, etc).
  if (context.toolResults?.length) {
    const ok = context.toolResults.filter((t) => t.ok);
    const errs = context.toolResults.filter((t) => !t.ok);
    if (ok.length > 0) {
      lines.push('', 'Data fetched by the planner — use these values when composing the UI:');
      for (const t of ok) {
        lines.push(`  - ${t.kind}__${t.name}(${safeJSON(t.input)}) → ${safeJSON(t.output)}`);
      }
    }
    if (errs.length > 0) {
      lines.push('', 'Tool errors — surface only if relevant to the user:');
      for (const t of errs) {
        const msg = t.error
          ? `${t.error.code}${t.error.status ? ` (HTTP ${t.error.status})` : ''}: ${t.error.message}`
          : 'unknown error';
        lines.push(`  - ${t.kind}__${t.name}: ${msg}`);
      }
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

function safeJSON(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    return s.length > 500 ? s.slice(0, 499) + '…' : s;
  } catch {
    return String(v);
  }
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
