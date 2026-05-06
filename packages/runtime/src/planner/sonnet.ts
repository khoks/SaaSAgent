/**
 * SonnetPlanner — Phase 2.1b.
 *
 * The real planner. Runs a multi-round Anthropic tool_use loop against
 * claude-sonnet-4-6: each round, the model sees the user's intent + accumulated
 * memory recall + the registered Skills & Tools as Anthropic tool definitions,
 * and decides whether to (a) call more tools or (b) respond with a brief
 * plain-text summary. We stop when the model returns stop_reason !== 'tool_use'
 * OR when we hit the per-plan round cap (default 5).
 *
 * Routing: the model receives every Skill as `skill__<name>` and every Tool
 * as `tool__<name>` (see tool-mapper). When a tool_use block comes back we
 * parse the prefix and dispatch to SkillExecutor or ToolExecutor accordingly.
 *
 * The composer in Phase 2.1c will receive `invocations` via ComposeContext
 * and use the actual fetched data when rendering. For now the planner returns:
 *   • `intent`      — the user's original message text (preserves cache-key shape).
 *   • `invocations` — every tool call + result, in order.
 *   • `narration`   — the model's final plain-text summary (UI may surface it).
 */

import type {
  ConversationContext,
  FeatureRegistry,
  InstructionEnvelope,
  MemoryRecall,
} from '@saasagent/protocol';

import type { SkillExecutor, ToolExecutor } from '../executor/index.js';
import type { MemoryProvider } from '../memory/index.js';
import type {
  GenerateRequest,
  ModelContentBlock,
  ModelMessage,
  ModelProvider,
} from '../model/index.js';
import type { FeatureRegistryStore } from '../registry/features.js';
import type { SkillRegistryStore } from '../registry/skills.js';
import type { ToolRegistryStore } from '../registry/tools.js';

import { descriptorsToTools, parseToolName } from './tool-mapper.js';
import type { Planner, PlanRequest, PlanResult, ToolInvocation } from './types.js';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const DEFAULT_MAX_ROUNDS = 5;
const DEFAULT_MAX_TOKENS = 4096;

const PLANNER_SYSTEM_PROMPT = `You are the planner for an embedded SaaS agent.

Your job:
1. Read the user's message and any context provided.
2. Decide whether any registered Skills or Tools should be called to fetch data
   the agent needs to respond.
3. Call tools as needed — you may chain multiple rounds (call a tool, see the
   result, then call another).
4. When you have enough information, respond with a brief plain-text summary
   under 200 words. The UI is composed separately by another model; your
   summary is supplementary narration, not the user-facing answer.

Tool naming convention:
  • skill__<name> — in-process Skills (typed, deterministic, fast)
  • tool__<name>  — HTTP API calls (may fail with network errors or non-2xx)

If a tool returns an error, decide whether to (a) try a different tool, (b)
proceed with what you have, or (c) explain the failure in your summary. Do
NOT retry the exact same failing call — it will fail the same way.

Be concise. Don't narrate every step. Don't repeat the user's message back.`;

export interface SonnetPlannerOptions {
  provider: ModelProvider;
  skillExecutor: SkillExecutor;
  toolExecutor: ToolExecutor;
  skillRegistry: SkillRegistryStore;
  toolRegistry: ToolRegistryStore;
  /** Phase 2.2: Features registry — domain `.feature.md` docs the planner reads as super-skill context. */
  featureRegistry?: FeatureRegistryStore;
  memoryProvider: MemoryProvider;
  /** Sonnet model id. Default 'claude-sonnet-4-6'. */
  model?: string;
  /** Max tool-use rounds per plan() before stopping. Default 5. */
  maxRounds?: number;
  /** Max output tokens per round. Default 4096. */
  maxTokens?: number;
}

export class SonnetPlanner implements Planner {
  readonly name = 'sonnet';

  constructor(private readonly options: SonnetPlannerOptions) {}

  async plan(req: PlanRequest): Promise<PlanResult> {
    const initialIntent = extractInitialIntent(req.envelope);

    // Recall memory before planning so the model can disambiguate references.
    // Scoped to req.sessionId (Phase 2.3) — RuntimeServer assigns one per WS
    // connection so concurrent users don't share a turn log.
    const recall = await this.options.memoryProvider.recall({
      text: initialIntent,
      sessionId: req.sessionId,
    });

    // Snapshot the registries so the model sees a stable set within this plan.
    const skillsSnapshot = this.options.skillRegistry.get();
    const toolsSnapshot = this.options.toolRegistry.get();
    const featuresSnapshot = this.options.featureRegistry?.get();
    const toolDefs = descriptorsToTools(skillsSnapshot, toolsSnapshot);

    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: buildPlannerUserMessage(initialIntent, req.context, recall, featuresSnapshot),
      },
    ];

    const invocations: ToolInvocation[] = [];
    const maxRounds = this.options.maxRounds ?? DEFAULT_MAX_ROUNDS;
    let lastText = '';

    for (let round = 0; round < maxRounds; round++) {
      const generateReq: GenerateRequest = {
        model: this.options.model ?? DEFAULT_MODEL,
        system: PLANNER_SYSTEM_PROMPT,
        messages,
        maxTokens: this.options.maxTokens ?? DEFAULT_MAX_TOKENS,
      };
      if (toolDefs.length > 0) {
        generateReq.tools = toolDefs;
        generateReq.toolChoice = 'auto';
      }

      const response = await this.options.provider.generate(generateReq);
      lastText = response.text;

      if (response.stopReason !== 'tool_use') {
        // Model is done — no more tools requested.
        break;
      }

      // The model wants to call one or more tools. Push its turn into the
      // conversation, execute each tool_use, then push a single user turn
      // bundling all tool_results (Anthropic requires every tool_use to be
      // answered before the next assistant turn).
      messages.push({ role: 'assistant', content: response.content });

      const toolResults: ModelContentBlock[] = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        const result = await this.dispatchToolUse(block.name, block.id, block.input);
        if (result.invocation) invocations.push(result.invocation);
        toolResults.push(result.toolResult);
      }

      if (toolResults.length === 0) {
        // Defensive: stop_reason was 'tool_use' but no tool_use blocks parsed.
        // Treat as done to avoid an infinite loop.
        break;
      }

      messages.push({ role: 'user', content: toolResults });
    }

    // Persist the user's message + the planner's narration into memory so
    // future plans can reference them. Scoped to the same sessionId used for recall.
    const now = new Date().toISOString();
    await this.options.memoryProvider.record(
      { speaker: 'user', text: initialIntent, at: now },
      req.sessionId,
    );
    if (lastText.length > 0) {
      await this.options.memoryProvider.record(
        { speaker: 'agent', text: lastText, at: now },
        req.sessionId,
      );
    }

    const result: PlanResult = {
      intent: initialIntent,
      invocations,
    };
    if (lastText.length > 0) {
      result.narration = lastText;
    }
    return result;
  }

  private async dispatchToolUse(
    qualifiedName: string,
    toolUseId: string,
    input: unknown,
  ): Promise<{ invocation?: ToolInvocation; toolResult: ModelContentBlock }> {
    const parsed = parseToolName(qualifiedName);
    if (!parsed) {
      return {
        toolResult: {
          type: 'tool_result',
          tool_use_id: toolUseId,
          content: `Unknown tool "${qualifiedName}" — must be prefixed skill__ or tool__.`,
          is_error: true,
        },
      };
    }
    const result =
      parsed.kind === 'skill'
        ? await this.options.skillExecutor.execute(parsed.name, input)
        : await this.options.toolExecutor.execute(parsed.name, input);
    const invocation: ToolInvocation = {
      name: parsed.name,
      kind: parsed.kind,
      input,
      result,
    };
    // eslint-disable-next-line no-console
    console.log(
      `[sonnet-planner] ${parsed.kind}__${parsed.name}(${safeJSONStringify(input).slice(0, 120)}) → ${result.ok ? 'ok' : `error:${result.error.code}`} (${result.durationMs}ms)`,
    );
    const content = result.ok
      ? safeJSONStringify(result.output)
      : safeJSONStringify({ error: result.error.message, code: result.error.code });
    return {
      invocation,
      toolResult: {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content,
        is_error: !result.ok,
      },
    };
  }
}

function extractInitialIntent(env: InstructionEnvelope): string {
  if (env.type === 'user-message') {
    const t = (env.payload as { text?: unknown } | undefined)?.text;
    if (typeof t === 'string' && t.trim().length > 0) return t.trim();
    return 'empty-user-message';
  }
  return env.type;
}

function buildPlannerUserMessage(
  intent: string,
  ctx: ConversationContext,
  recall: ReadonlyArray<MemoryRecall>,
  features?: FeatureRegistry,
): string {
  const parts: string[] = [`User said: "${intent}"`];

  const recentTurns = ctx.recentTurns ?? [];
  if (recentTurns.length > 0) {
    parts.push('', 'Recent conversation:');
    for (const turn of recentTurns) {
      parts.push(`- ${turn.speaker}: "${truncate(turn.text, 200)}"`);
    }
  }

  const memoryAll = [...(ctx.memoryRecall ?? []), ...recall];
  if (memoryAll.length > 0) {
    parts.push('', 'Memory recall:');
    for (const m of memoryAll) {
      parts.push(`- (${m.store}) ${truncate(m.summary, 200)}`);
    }
  }

  // Phase 2.2: features are domain documents the planner reads to ground its
  // decisions. Each feature contributes a header line (summary + when-relevant)
  // followed by its full content. They land in the user message (not the system
  // prompt) so they evolve with the host's registry without invalidating
  // planner-prompt cache entries that target tools+skills only.
  if (features && Object.keys(features.features).length > 0) {
    parts.push('', 'Domain features available in this host (read these to ground your decisions):');
    const sorted = Object.values(features.features).sort((a, b) => a.name.localeCompare(b.name));
    for (const f of sorted) {
      parts.push('');
      parts.push(`### Feature: ${f.name} (v${f.version})`);
      parts.push(`Summary: ${f.summary}`);
      parts.push(`When relevant: ${f.whenRelevant}`);
      if (f.content.trim().length > 0) {
        parts.push('---');
        parts.push(f.content.trim());
        parts.push('---');
      }
    }
  }

  return parts.join('\n');
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function safeJSONStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// Exported for tests only.
export const __test = {
  extractInitialIntent,
  buildPlannerUserMessage,
  PLANNER_SYSTEM_PROMPT,
  DEFAULT_MAX_ROUNDS,
};
