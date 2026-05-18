import { describe, it, expect, vi } from 'vitest';
import type {
  ConversationContext,
  FeatureDescriptor,
  InstructionEnvelope,
  SkillDescriptor,
  SubAgentDescriptor,
  ToolDescriptor,
} from '@saasagent/protocol';

import { SkillExecutor, SubAgentExecutor, ToolExecutor } from '../executor/index.js';
import { NullMemoryProvider } from '../memory/index.js';
import { MockProvider, type GenerateResponse } from '../model/index.js';
import {
  InMemoryFeatureRegistry,
  InMemorySkillRegistry,
  InMemorySubAgentRegistry,
  InMemoryToolRegistry,
} from '../registry/index.js';

import { SonnetPlanner, __test } from './sonnet.js';

const baseContext: ConversationContext = { intent: 'welcome' };

function envelope(overrides: Partial<InstructionEnvelope> = {}): InstructionEnvelope {
  return {
    composeCycleId: 'cyc-1',
    sourceNodeId: 'user-input',
    emittedAt: new Date().toISOString(),
    type: 'user-message',
    sequence: 0,
    payload: { text: 'show me a TV under 800' },
    ...overrides,
  };
}

interface Setup {
  planner: SonnetPlanner;
  provider: MockProvider;
  skillRegistry: InMemorySkillRegistry;
  toolRegistry: InMemoryToolRegistry;
  skillExecutor: SkillExecutor;
  toolExecutor: ToolExecutor;
  memory: NullMemoryProvider;
}

function setup(opts: {
  responses: GenerateResponse[] | Array<Partial<GenerateResponse>>;
  skills?: ReadonlyArray<SkillDescriptor>;
  tools?: ReadonlyArray<ToolDescriptor>;
  features?: ReadonlyArray<FeatureDescriptor>;
  subAgents?: ReadonlyArray<SubAgentDescriptor>;
  fetch?: typeof globalThis.fetch;
  subAgentFetch?: typeof globalThis.fetch;
  maxRounds?: number;
}): Setup {
  const provider = new MockProvider(opts.responses);
  const skillRegistry = new InMemorySkillRegistry();
  if (opts.skills?.length) skillRegistry.replace(opts.skills);
  const toolRegistry = new InMemoryToolRegistry();
  if (opts.tools?.length) toolRegistry.replace(opts.tools);
  const featureRegistry = new InMemoryFeatureRegistry();
  if (opts.features?.length) featureRegistry.replace(opts.features);
  const subAgentRegistry = new InMemorySubAgentRegistry();
  if (opts.subAgents?.length) subAgentRegistry.replace(opts.subAgents);
  const skillExecutor = new SkillExecutor({ registry: skillRegistry });
  const toolExecutor = new ToolExecutor({ registry: toolRegistry, fetch: opts.fetch });
  const subAgentExecutor = new SubAgentExecutor({
    registry: subAgentRegistry,
    fetch: opts.subAgentFetch ?? opts.fetch,
  });
  const memory = new NullMemoryProvider();
  const planner = new SonnetPlanner({
    provider,
    skillExecutor,
    toolExecutor,
    subAgentExecutor,
    skillRegistry,
    toolRegistry,
    subAgentRegistry,
    featureRegistry,
    memoryProvider: memory,
    ...(opts.maxRounds !== undefined ? { maxRounds: opts.maxRounds } : {}),
  });
  return { planner, provider, skillRegistry, toolRegistry, skillExecutor, toolExecutor, memory };
}

/** Build a stub fetch that returns a fixed Response for any URL. */
function stubFetch(impl: (url: string) => Response): typeof globalThis.fetch {
  return ((input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return Promise.resolve(impl(url));
  }) as typeof globalThis.fetch;
}

describe('SonnetPlanner', () => {
  it('reports its name', () => {
    const { planner } = setup({ responses: [{ text: 'done', stopReason: 'end_turn' }] });
    expect(planner.name).toBe('sonnet');
  });

  it('returns intent + narration when the model responds without calling tools', async () => {
    const { planner, provider } = setup({
      responses: [{ text: 'Nothing to fetch — proceeding with what you asked.', stopReason: 'end_turn' }],
    });
    const r = await planner.plan({
      envelope: envelope({ payload: { text: 'just say hi' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('just say hi');
    expect(r.invocations).toEqual([]);
    expect(r.narration).toBe('Nothing to fetch — proceeding with what you asked.');
    // One round used
    expect(provider.requests).toHaveLength(1);
  });

  it('runs a single tool-use round, executes the skill, then returns', async () => {
    const skill: SkillDescriptor = {
      name: 'price-compare',
      version: '1.0.0',
      description: 'Compare prices',
      whenToUse: 'when comparing two products',
      kind: 'in-process',
    };
    const { planner, provider, skillExecutor } = setup({
      responses: [
        // Round 1: model asks to call price-compare
        {
          stopReason: 'tool_use',
          content: [
            { type: 'text', text: 'Comparing prices…' },
            {
              type: 'tool_use',
              id: 'tu_1',
              name: 'skill__price-compare',
              input: { a: 'tv-55', b: 'tv-65' },
            },
          ],
        },
        // Round 2: model summarizes
        { text: 'tv-55 is cheaper.', stopReason: 'end_turn' },
      ],
      skills: [skill],
    });
    skillExecutor.registerHandler<{ a: string; b: string }, { winner: string }>(
      'price-compare',
      (input) => ({ winner: input.a }),
    );

    const r = await planner.plan({
      envelope: envelope({ payload: { text: 'compare tv-55 vs tv-65' } }),
      context: baseContext,
    });

    expect(r.intent).toBe('compare tv-55 vs tv-65');
    expect(r.invocations).toHaveLength(1);
    expect(r.invocations[0]).toMatchObject({
      kind: 'skill',
      name: 'price-compare',
      input: { a: 'tv-55', b: 'tv-65' },
    });
    expect(r.invocations[0]!.result.ok).toBe(true);
    expect(r.narration).toBe('tv-55 is cheaper.');
    expect(provider.requests).toHaveLength(2);

    // Round 2's messages should include the assistant's tool_use turn + a user
    // tool_result turn with the executor's output JSON-stringified.
    const round2Messages = provider.requests[1]!.messages;
    expect(round2Messages).toHaveLength(3); // user, assistant(tool_use), user(tool_result)
    const lastMsg = round2Messages[2]!;
    expect(lastMsg.role).toBe('user');
    const toolResult = (lastMsg.content as Array<{ type: string; content?: string }>)[0]!;
    expect(toolResult.type).toBe('tool_result');
    expect(toolResult.content).toContain('"winner":"tv-55"');
  });

  it('routes tool__-prefixed names to the ToolExecutor', async () => {
    const tool: ToolDescriptor = {
      name: 'get-product',
      version: '1.0.0',
      description: 'Fetch product',
      whenToUse: 'product lookup',
      method: 'GET',
      urlTemplate: 'https://api.host.com/products/{id}',
    };
    const fetcher = stubFetch(
      () =>
        new Response(JSON.stringify({ id: 'tv-55', price: 749 }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const { planner } = setup({
      responses: [
        {
          stopReason: 'tool_use',
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'tool__get-product', input: { id: 'tv-55' } },
          ],
        },
        { text: 'Found it for $749.', stopReason: 'end_turn' },
      ],
      tools: [tool],
      fetch: fetcher,
    });
    const r = await planner.plan({
      envelope: envelope({ payload: { text: 'fetch tv-55' } }),
      context: baseContext,
    });
    expect(r.invocations).toHaveLength(1);
    expect(r.invocations[0]!.kind).toBe('tool');
    expect(r.invocations[0]!.result.ok).toBe(true);
    if (r.invocations[0]!.result.ok) {
      expect(r.invocations[0]!.result.output).toEqual({ id: 'tv-55', price: 749 });
    }
  });

  it('passes errored tool results back to the model with is_error=true', async () => {
    const tool: ToolDescriptor = {
      name: 'broken',
      version: '1.0.0',
      description: 'Always 500s',
      whenToUse: 'never',
      method: 'GET',
      urlTemplate: 'https://api.host.com/{id}',
    };
    const fetcher = stubFetch(() => new Response('upstream broken', { status: 500 }));
    const { planner, provider } = setup({
      responses: [
        {
          stopReason: 'tool_use',
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'tool__broken', input: { id: 'x' } },
          ],
        },
        { text: 'The upstream is down — try again later.', stopReason: 'end_turn' },
      ],
      tools: [tool],
      fetch: fetcher,
    });
    const r = await planner.plan({ envelope: envelope({ payload: { text: 'fetch x' } }), context: baseContext });
    expect(r.invocations).toHaveLength(1);
    expect(r.invocations[0]!.result.ok).toBe(false);

    const round2 = provider.requests[1]!;
    const lastMsg = round2.messages[2]!;
    const toolResult = (lastMsg.content as Array<{ type: string; is_error?: boolean; content?: string }>)[0]!;
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toContain('http-status');
  });

  it('reports unknown tool names as is_error tool_results without dispatching', async () => {
    const skillExecuteSpy = vi.fn();
    const tool: ToolDescriptor = {
      name: 'real-tool',
      version: '1.0.0',
      description: 'real',
      whenToUse: 'sometimes',
      method: 'GET',
      urlTemplate: 'https://x/{a}',
    };
    const { planner, provider, toolExecutor } = setup({
      responses: [
        {
          stopReason: 'tool_use',
          content: [
            { type: 'tool_use', id: 'tu_1', name: 'unprefixed-name', input: {} },
          ],
        },
        { text: 'Stopping.', stopReason: 'end_turn' },
      ],
      tools: [tool],
    });
    toolExecutor.execute = vi.fn(); // shouldn't be called
    void skillExecuteSpy;

    const r = await planner.plan({ envelope: envelope({ payload: { text: 'go' } }), context: baseContext });
    expect(r.invocations).toEqual([]);
    expect(toolExecutor.execute).not.toHaveBeenCalled();
    const round2 = provider.requests[1]!;
    const toolResult = (round2.messages[2]!.content as Array<{ is_error?: boolean; content?: string }>)[0]!;
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toMatch(/Unknown tool/);
  });

  it('stops after maxRounds even if the model keeps requesting tools', async () => {
    const skill: SkillDescriptor = {
      name: 'inf',
      version: '1.0.0',
      description: 'inf',
      whenToUse: 'inf',
      kind: 'in-process',
    };
    // Build 10 tool_use responses — planner should only run maxRounds (=3)
    const responses: Array<Partial<GenerateResponse>> = Array.from({ length: 10 }, (_, i) => ({
      stopReason: 'tool_use',
      content: [{ type: 'tool_use', id: `tu_${i}`, name: 'skill__inf', input: {} }],
    }));
    const { planner, provider, skillExecutor } = setup({
      responses,
      skills: [skill],
      maxRounds: 3,
    });
    skillExecutor.registerHandler('inf', () => ({ ok: true }));
    const r = await planner.plan({ envelope: envelope({ payload: { text: 'forever' } }), context: baseContext });
    expect(provider.requests.length).toBe(3);
    expect(r.invocations.length).toBe(3);
  });

  it('passes tool_use=auto + tools array to the provider', async () => {
    const skill: SkillDescriptor = {
      name: 'a',
      version: '1.0.0',
      description: 'a',
      whenToUse: 'a',
      kind: 'in-process',
    };
    const { planner, provider } = setup({
      responses: [{ text: 'done', stopReason: 'end_turn' }],
      skills: [skill],
    });
    await planner.plan({ envelope: envelope({ payload: { text: 'go' } }), context: baseContext });
    expect(provider.requests[0]!.tools?.[0]?.name).toBe('skill__a');
    expect(provider.requests[0]!.toolChoice).toBe('auto');
  });

  it('omits tools when registries are empty', async () => {
    const { planner, provider } = setup({
      responses: [{ text: 'done', stopReason: 'end_turn' }],
    });
    await planner.plan({ envelope: envelope({ payload: { text: 'go' } }), context: baseContext });
    expect(provider.requests[0]!.tools).toBeUndefined();
    expect(provider.requests[0]!.toolChoice).toBeUndefined();
  });

  it('records turns into the memory provider after planning', async () => {
    const { planner, memory } = setup({
      responses: [{ text: 'okay', stopReason: 'end_turn' }],
    });
    const recordSpy = vi.spyOn(memory, 'record');
    await planner.plan({ envelope: envelope({ payload: { text: 'hi' } }), context: baseContext });
    expect(recordSpy).toHaveBeenCalledTimes(2);
    expect(recordSpy.mock.calls[0]![0]).toMatchObject({ speaker: 'user', text: 'hi' });
    expect(recordSpy.mock.calls[1]![0]).toMatchObject({ speaker: 'agent', text: 'okay' });
  });

  it('threads PlanRequest.sessionId into MemoryProvider.recall + record', async () => {
    const { planner, memory } = setup({
      responses: [{ text: 'ok', stopReason: 'end_turn' }],
    });
    const recallSpy = vi.spyOn(memory, 'recall');
    const recordSpy = vi.spyOn(memory, 'record');
    await planner.plan({
      envelope: envelope({ payload: { text: 'hi' } }),
      context: baseContext,
      sessionId: 'sess-XYZ',
    });
    expect(recallSpy.mock.calls[0]![0]).toMatchObject({ sessionId: 'sess-XYZ' });
    // recordSpy: [turn, sessionId]
    expect(recordSpy.mock.calls[0]![1]).toBe('sess-XYZ');
    expect(recordSpy.mock.calls[1]![1]).toBe('sess-XYZ');
  });

  it('preserves envelope.type as intent for non-user-message envelopes', async () => {
    const { planner } = setup({ responses: [{ text: '', stopReason: 'end_turn' }] });
    const r = await planner.plan({
      envelope: envelope({ type: 'find-similar-tv', payload: { productId: 'sony-bravia' } }),
      context: baseContext,
    });
    expect(r.intent).toBe('find-similar-tv');
  });

  it('formats memory recall + recent turns into the user message', () => {
    const msg = __test.buildPlannerUserMessage(
      'compare these two',
      {
        intent: 'compare',
        recentTurns: [
          { speaker: 'user', text: 'hi', at: '2026-01-01T00:00:00Z' },
          { speaker: 'agent', text: 'how can I help?', at: '2026-01-01T00:00:01Z' },
        ],
      },
      [{ store: 'qdrant', summary: 'previously interested in 4K TVs' }],
    );
    expect(msg).toContain('User said: "compare these two"');
    expect(msg).toContain('user: "hi"');
    expect(msg).toContain('agent: "how can I help?"');
    expect(msg).toContain('(qdrant) previously interested in 4K TVs');
  });

  /**
   * Phase 2.2: features in the user message.
   */
  it('embeds registered features into the planner user message', async () => {
    const featureA: FeatureDescriptor = {
      name: 'product-search',
      version: '1.0.0',
      summary: 'Search the catalog by category, price, brand',
      whenRelevant: 'Use when the user wants to discover products.',
      content: '# Product Search\n\nFilters: category, price-range, brand.',
    };
    const featureB: FeatureDescriptor = {
      name: 'checkout',
      version: '1.0.0',
      summary: 'Cart-to-purchase flow including payment',
      whenRelevant: 'Use when the user is ready to purchase.',
      content: '# Checkout\n\nSupports credit card, PayPal, Apple Pay.',
    };
    const { planner, provider } = setup({
      responses: [{ text: 'ok', stopReason: 'end_turn' }],
      features: [featureA, featureB],
    });
    await planner.plan({
      envelope: envelope({ payload: { text: 'how do I buy a TV?' } }),
      context: baseContext,
    });
    const userMsg = provider.requests[0]!.messages[0]!.content;
    expect(typeof userMsg).toBe('string');
    if (typeof userMsg === 'string') {
      expect(userMsg).toContain('Domain features available in this host');
      // Sorted alphabetically: checkout before product-search
      const checkoutIdx = userMsg.indexOf('Feature: checkout');
      const productSearchIdx = userMsg.indexOf('Feature: product-search');
      expect(checkoutIdx).toBeGreaterThan(0);
      expect(productSearchIdx).toBeGreaterThan(checkoutIdx);
      expect(userMsg).toContain('Filters: category, price-range, brand');
      expect(userMsg).toContain('Supports credit card, PayPal, Apple Pay');
    }
  });

  it('omits the features section when registry is empty', async () => {
    const { planner, provider } = setup({ responses: [{ text: 'ok', stopReason: 'end_turn' }] });
    await planner.plan({ envelope: envelope({ payload: { text: 'go' } }), context: baseContext });
    const userMsg = provider.requests[0]!.messages[0]!.content;
    if (typeof userMsg === 'string') {
      expect(userMsg).not.toContain('Domain features available');
    }
  });

  // Phase 2.4: sub-agent dispatch.
  it('dispatches subagent__ tool calls to the SubAgentExecutor (intent passthrough)', async () => {
    const travel: SubAgentDescriptor = {
      name: 'travel',
      version: '1.0.0',
      description: 'Travel specialist',
      whenToUse: 'when the user wants to book travel',
      transport: 'http',
      endpoint: 'https://travel.host.com/federate',
    };
    const subFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
      const body = JSON.parse(String(init?.body ?? '{}'));
      return Promise.resolve(
        new Response(
          JSON.stringify({ narration: `Booked via ${url} for intent "${body.intent}"`, output: { ticketId: 'X-1' } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );
    }) as typeof globalThis.fetch;

    const { planner, provider } = setup({
      responses: [
        {
          stopReason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tu_1',
              name: 'subagent__travel',
              input: { intent: 'book SFO to NRT', payload: { from: 'SFO', to: 'NRT' } },
            },
          ],
        },
        { text: 'Booking confirmed.', stopReason: 'end_turn' },
      ],
      subAgents: [travel],
      subAgentFetch: subFetch,
    });

    const r = await planner.plan({
      envelope: envelope({ payload: { text: 'I need a flight to Tokyo' } }),
      context: baseContext,
    });
    expect(r.invocations).toHaveLength(1);
    expect(r.invocations[0]!.kind).toBe('subagent');
    expect(r.invocations[0]!.name).toBe('travel');
    expect(r.invocations[0]!.result.ok).toBe(true);
    if (r.invocations[0]!.result.ok) {
      expect((r.invocations[0]!.result.output as { narration: string }).narration).toContain(
        'book SFO to NRT',
      );
    }
    // Round 2's tool_result content should serialize the FederationResponse JSON.
    const round2 = provider.requests[1]!;
    const toolResult = (round2.messages[2]!.content as Array<{ content: string }>)[0]!;
    expect(toolResult.content).toContain('"ticketId":"X-1"');
  });

  it('returns an is_error tool_result when the planner has no SubAgentExecutor and the model calls a subagent__', async () => {
    const provider = new MockProvider([
      {
        stopReason: 'tool_use',
        content: [
          { type: 'tool_use', id: 'tu_1', name: 'subagent__travel', input: { intent: 'x' } },
        ],
      },
      { text: 'OK', stopReason: 'end_turn' },
    ]);
    // Planner without subAgentExecutor: omit the constructor option.
    const skillRegistry = new InMemorySkillRegistry();
    const toolRegistry = new InMemoryToolRegistry();
    const skillExecutor = new SkillExecutor({ registry: skillRegistry });
    const toolExecutor = new ToolExecutor({ registry: toolRegistry });
    const memory = new NullMemoryProvider();
    const planner = new SonnetPlanner({
      provider,
      skillExecutor,
      toolExecutor,
      skillRegistry,
      toolRegistry,
      memoryProvider: memory,
    });
    const r = await planner.plan({
      envelope: envelope({ payload: { text: 'go' } }),
      context: baseContext,
    });
    expect(r.invocations).toEqual([]);
    const round2 = provider.requests[1]!;
    const toolResult = (round2.messages[2]!.content as Array<{ is_error?: boolean; content?: string }>)[0]!;
    expect(toolResult.is_error).toBe(true);
    expect(toolResult.content).toMatch(/Sub-agent dispatch unavailable/);
  });

  it('buildPlannerUserMessage formats features alphabetically with summary + content', () => {
    const msg = __test.buildPlannerUserMessage(
      'hi',
      { intent: 'hi' },
      [],
      {
        version: '1.0.0',
        features: {
          z: {
            name: 'z',
            version: '1.0.0',
            summary: 'z summary',
            whenRelevant: 'z when',
            content: 'z body',
          },
          a: {
            name: 'a',
            version: '1.0.0',
            summary: 'a summary',
            whenRelevant: 'a when',
            content: 'a body',
          },
        },
      },
    );
    const aIdx = msg.indexOf('Feature: a');
    const zIdx = msg.indexOf('Feature: z');
    expect(aIdx).toBeGreaterThan(0);
    expect(zIdx).toBeGreaterThan(aIdx);
    expect(msg).toContain('Summary: a summary');
    expect(msg).toContain('When relevant: a when');
  });

  /**
   * Regression for the user-reported bug: an Expedia-shaped skill name
   * 'expedia.search-flights' (contains a dot) violates the Anthropic
   * tool-name regex `^[a-zA-Z0-9_-]{1,128}$`. The fix sanitizes the dot to
   * underscore on the way OUT to the API and uses a per-plan resolver to
   * map the sanitized name back to the original on the way IN.
   *
   * This test models a full round-trip: the mock model receives the
   * sanitized name and returns a tool_use block with that sanitized name;
   * the planner must dispatch to the originally-registered handler under
   * the dotted name.
   */
  it('dispatches a tool_use that came back with a sanitized name back to the original handler', async () => {
    const dottedSkill: SkillDescriptor = {
      name: 'expedia.search-flights',
      version: '1.0.0',
      description: 'Search flights',
      whenToUse: 'when the user wants flights',
      kind: 'in-process',
      inputSchema: { type: 'object', properties: { origin: { type: 'string' } } },
    };
    const { planner, provider, skillExecutor } = setup({
      // The mock model "echoes" the sanitized form back as tool_use.name —
      // exactly what the real Anthropic API does.
      responses: [
        {
          stopReason: 'tool_use',
          content: [
            {
              type: 'tool_use',
              id: 'tu_1',
              name: 'skill__expedia_search-flights',
              input: { origin: 'SFO' },
            },
          ],
        },
        { text: 'Found 3 flights from SFO.', stopReason: 'end_turn' },
      ],
      skills: [dottedSkill],
    });
    // Register the handler under the ORIGINAL (dotted) name. If the
    // resolver fix is broken, dispatch would look up 'expedia_search-flights'
    // and miss, returning unknown-skill.
    let handlerCalledWith: unknown = null;
    skillExecutor.registerHandler('expedia.search-flights', (input: unknown) => {
      handlerCalledWith = input;
      return { count: 3, route: 'SFO→NRT' };
    });

    const result = await planner.plan({
      envelope: envelope({ payload: { text: 'find flights from SFO to Tokyo' } }),
      context: baseContext,
    });

    // The planner must have invoked the skill under its registered (dotted) name.
    expect(result.invocations).toHaveLength(1);
    expect(result.invocations[0]!.name).toBe('expedia.search-flights');
    expect(result.invocations[0]!.kind).toBe('skill');
    expect(result.invocations[0]!.result.ok).toBe(true);
    expect(handlerCalledWith).toEqual({ origin: 'SFO' });
    // And the tool advertised TO the model must have the sanitized name.
    const firstReq = provider.requests[0]!;
    expect(firstReq.tools?.map((t) => t.name)).toContain('skill__expedia_search-flights');
    // The original dotted form must NOT appear in what we send to the API.
    expect(firstReq.tools?.map((t) => t.name)).not.toContain('skill__expedia.search-flights');
  });
});
