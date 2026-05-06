import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { EventSource } from 'eventsource';
import type {
  ComposedLayout,
  ComposeContext,
  ErrorEnvelope,
  InstructionEnvelope,
  UIComposer,
} from '@saasagent/protocol';

import { ProviderError } from '../model/types.js';
import { StubComposer } from '../composer/stub.js';
import {
  InMemorySkillRegistry,
  InMemorySubAgentRegistry,
  InMemoryToolRegistry,
} from '../registry/index.js';
import { SkillExecutor, SubAgentExecutor, ToolExecutor } from '../executor/index.js';
import { KeyValueMemoryProvider, NullMemoryProvider } from '../memory/index.js';
import { KeyValueEvalProvider } from '../eval/index.js';
import type { Planner } from '../planner/index.js';
import { RuntimeServer } from './server.js';

/**
 * Integration test — runs a real RuntimeServer on an OS-assigned port,
 * connects with a real EventSource (Node 22+ native) + a real WebSocket
 * client (`ws` package), and verifies the full bidirectional loop:
 *
 *   1. SSE client connects → server emits a "welcome" layout.
 *   2. WS client sends an InstructionEnvelope.
 *   3. Server re-composes → broadcasts new layout to all SSE clients.
 */

describe('RuntimeServer integration', () => {
  let server: RuntimeServer;

  beforeEach(async () => {
    server = new RuntimeServer({ port: 0, composer: new StubComposer() });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('responds to /health with status ok', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; sseClients: number };
    expect(body.status).toBe('ok');
    expect(body.sseClients).toBe(0);
  });

  it('emits a welcome layout via SSE on connect', async () => {
    const layout = await receiveFirstSSELayout(`http://127.0.0.1:${server.port}/sse`);
    expect(layout.composeCycleId).toMatch(/^stub-/);
    expect(layout.root.component).toBe('Card');
    expect(layout.metadata?.intent).toBe('welcome');
  });

  it('rebuilds + broadcasts a new layout when WS receives an InstructionEnvelope', async () => {
    // 1. Open SSE; consume the welcome layout.
    const sseUrl = `http://127.0.0.1:${server.port}/sse`;
    const layouts: ComposedLayout[] = [];
    const sse = new EventSource(sseUrl);
    const layoutPromise = new Promise<void>((resolve) => {
      sse.addEventListener('layout', (e) => {
        layouts.push(JSON.parse((e as MessageEvent).data) as ComposedLayout);
        if (layouts.length === 2) resolve();
      });
    });
    // wait until welcome arrives
    await waitFor(() => layouts.length >= 1, 1500);

    // 2. Open WS, send an InstructionEnvelope.
    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
    await new Promise<void>((resolve) => ws.once('open', () => resolve()));
    const envelope: InstructionEnvelope = {
      composeCycleId: layouts[0]!.composeCycleId,
      sourceNodeId: 'btn-ack',
      emittedAt: new Date().toISOString(),
      type: 'find-similar-tv',
      sequence: 0,
      payload: { productId: 'sony-bravia-55' },
    };
    ws.send(JSON.stringify(envelope));

    // 3. Wait for the second layout.
    await layoutPromise;

    expect(layouts).toHaveLength(2);
    expect(layouts[1]!.metadata?.intent).toBe('find-similar-tv');
    expect(layouts[1]!.root.props?.['title']).toContain('find-similar-tv');

    ws.close();
    sse.close();
  });

  /**
   * Phase 2.1c integration: a Planner that returns invocations should result
   * in those being passed through to the Composer as ComposeContext.toolResults.
   * Uses a custom recording composer + a fake planner so we can assert the
   * full WS → Planner → Composer hand-off without needing a real LLM.
   */
  it('forwards planner invocations to ComposeContext.toolResults', async () => {
    const captures: Array<{ intent: string; toolResultsCount: number; toolResultName?: string }> = [];
    const recordingComposer: UIComposer = {
      compose: async (intent, ctx) => {
        captures.push({
          intent,
          toolResultsCount: ctx.toolResults?.length ?? 0,
          ...(ctx.toolResults?.[0]?.name ? { toolResultName: ctx.toolResults[0]!.name } : {}),
        });
        return {
          composeCycleId: `rec-${captures.length}`,
          composedAt: new Date().toISOString(),
          root: { id: 'r', component: 'Card', props: {} },
          metadata: { intent, sources: ['recording-composer'], modelUsed: { composer: 'rec' }, fromCache: false },
        };
      },
    };
    const fakePlanner: Planner = {
      name: 'fake',
      plan: async (req) => ({
        intent: 'find tv-55',
        invocations: [
          {
            name: 'get-product',
            kind: 'tool',
            input: { id: 'tv-55' },
            result: {
              ok: true,
              output: { name: 'Sony Bravia 55', price: 749 },
              durationMs: 100,
            },
          },
        ],
        narration: `Found tv-55 for $749 (cycle: ${req.envelope.composeCycleId}).`,
      }),
    };

    const fakeServer = new RuntimeServer({
      port: 0,
      composer: recordingComposer,
      planner: fakePlanner,
    });
    await fakeServer.start();
    try {
      const sse = new EventSource(`http://127.0.0.1:${fakeServer.port}/sse`);
      const layouts: ComposedLayout[] = [];
      sse.addEventListener('layout', (e) => {
        layouts.push(JSON.parse((e as MessageEvent).data) as ComposedLayout);
      });
      await waitFor(() => layouts.length >= 1, 1500);

      const ws = new WebSocket(`ws://127.0.0.1:${fakeServer.port}/ws`);
      await new Promise<void>((resolve) => ws.once('open', () => resolve()));
      ws.send(
        JSON.stringify({
          composeCycleId: layouts[0]!.composeCycleId,
          sourceNodeId: 'user-input',
          emittedAt: new Date().toISOString(),
          type: 'user-message',
          sequence: 0,
          payload: { text: 'find me tv-55' },
        }),
      );

      await waitFor(() => captures.length >= 2, 1500);
      // captures[0] is the welcome compose (no envelope, no tool results).
      // captures[1] is the planner-driven compose — must carry toolResults.
      expect(captures[1]!.intent).toBe('find tv-55');
      expect(captures[1]!.toolResultsCount).toBe(1);
      expect(captures[1]!.toolResultName).toBe('get-product');

      ws.close();
      sse.close();
    } finally {
      await fakeServer.stop();
    }
  });

  /**
   * Phase 2.1a fix: prior to the planner, a `user-message` envelope was
   * routed as `composer.compose('user-message', ...)` — composer never saw
   * the actual text. With StubPlanner, payload.text becomes the intent.
   */
  it('routes user-message envelopes via the planner (payload.text becomes intent)', async () => {
    const sseUrl = `http://127.0.0.1:${server.port}/sse`;
    const layouts: ComposedLayout[] = [];
    const sse = new EventSource(sseUrl);
    sse.addEventListener('layout', (e) => {
      layouts.push(JSON.parse((e as MessageEvent).data) as ComposedLayout);
    });
    await waitFor(() => layouts.length >= 1, 1500);

    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
    await new Promise<void>((resolve) => ws.once('open', () => resolve()));
    const envelope: InstructionEnvelope = {
      composeCycleId: layouts[0]!.composeCycleId,
      sourceNodeId: 'user-input',
      emittedAt: new Date().toISOString(),
      type: 'user-message',
      sequence: 0,
      payload: { text: 'show me a TV under 800 dollars' },
    };
    ws.send(JSON.stringify(envelope));

    await waitFor(() => layouts.length >= 2, 1500);
    // The composer (StubComposer here) sees the actual text as intent, NOT
    // the literal string 'user-message'.
    expect(layouts[1]!.metadata?.intent).toBe('show me a TV under 800 dollars');
    expect(layouts[1]!.metadata?.intent).not.toBe('user-message');

    ws.close();
    sse.close();
  });
});

async function receiveFirstSSELayout(sseUrl: string): Promise<ComposedLayout> {
  return new Promise((resolve, reject) => {
    const sse = new EventSource(sseUrl);
    const timeout = setTimeout(() => {
      sse.close();
      reject(new Error('timed out waiting for SSE layout event'));
    }, 2000);
    sse.addEventListener('layout', (e) => {
      clearTimeout(timeout);
      sse.close();
      resolve(JSON.parse((e as MessageEvent).data) as ComposedLayout);
    });
    sse.onerror = (err) => {
      clearTimeout(timeout);
      sse.close();
      reject(new Error(`SSE error: ${JSON.stringify(err)}`));
    };
  });
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 25));
  }
}

class FailingComposer implements UIComposer {
  constructor(private readonly toThrow: () => Error) {}
  async compose(_intent: string, _ctx: ComposeContext): Promise<ComposedLayout> {
    throw this.toThrow();
  }
}

describe('RuntimeServer error propagation', () => {
  it('emits a composer-error SSE event when the welcome composer throws', async () => {
    const failing = new RuntimeServer({
      port: 0,
      composer: new FailingComposer(() => new ProviderError('test API failure', undefined, false)),
    });
    await failing.start();
    try {
      const envelope = await receiveFirstSSEError(`http://127.0.0.1:${failing.port}/sse`);
      expect(envelope.category).toBe('composer-error');
      expect(envelope.code).toBe('provider-error');
      expect(envelope.message).toContain('test API failure');
      expect(envelope.retryable).toBe(false);
    } finally {
      await failing.stop();
    }
  });

  it('emits an unknown-error SSE event when a non-Error value is thrown', async () => {
    const failing = new RuntimeServer({
      port: 0,
      composer: new FailingComposer(() => 'string-thrown' as unknown as Error),
    });
    await failing.start();
    try {
      const envelope = await receiveFirstSSEError(`http://127.0.0.1:${failing.port}/sse`);
      expect(envelope.category).toBe('unknown-error');
      expect(envelope.code).toBe('unknown');
      expect(envelope.message).toBe('string-thrown');
    } finally {
      await failing.stop();
    }
  });

  it('emits a composer-error SSE event for plain Error throws (non-ProviderError)', async () => {
    const failing = new RuntimeServer({
      port: 0,
      composer: new FailingComposer(() => new Error('sad path')),
    });
    await failing.start();
    try {
      const envelope = await receiveFirstSSEError(`http://127.0.0.1:${failing.port}/sse`);
      expect(envelope.category).toBe('composer-error');
      expect(envelope.code).toBe('compose-failed');
      expect(envelope.retryable).toBe(false);
    } finally {
      await failing.stop();
    }
  });
});

async function receiveFirstSSEError(sseUrl: string): Promise<ErrorEnvelope> {
  return new Promise((resolve, reject) => {
    const sse = new EventSource(sseUrl);
    const timeout = setTimeout(() => {
      sse.close();
      reject(new Error('timed out waiting for SSE composer-error event'));
    }, 2000);
    const handler = (e: Event): void => {
      clearTimeout(timeout);
      sse.close();
      try {
        resolve(JSON.parse((e as MessageEvent).data) as ErrorEnvelope);
      } catch (err) {
        reject(err as Error);
      }
    };
    sse.addEventListener('composer-error', handler);
    sse.addEventListener('unknown-error', handler);
  });
}

/**
 * Phase 2.0c — REST endpoints for SkillExecutor + ToolExecutor.
 *
 * Each test stands up a fresh server with explicit registries + executors so we
 * can register skill handlers and inject a stub fetch into the ToolExecutor.
 */
describe('RuntimeServer executor REST endpoints', () => {
  let skillRegistry: InMemorySkillRegistry;
  let toolRegistry: InMemoryToolRegistry;
  let skillExecutor: SkillExecutor;
  let toolExecutor: ToolExecutor;
  let server: RuntimeServer;
  let stubFetchImpl: (url: string, init?: RequestInit) => Promise<Response> | Response;

  beforeEach(async () => {
    skillRegistry = new InMemorySkillRegistry();
    toolRegistry = new InMemoryToolRegistry();
    skillExecutor = new SkillExecutor({ registry: skillRegistry });
    stubFetchImpl = () =>
      new Response(JSON.stringify({ default: 'stub' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    toolExecutor = new ToolExecutor({
      registry: toolRegistry,
      fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        return Promise.resolve(stubFetchImpl(url, init));
      }) as typeof globalThis.fetch,
    });

    skillRegistry.replace([
      {
        name: 'echo',
        version: '1.0.0',
        description: 'Echoes input',
        whenToUse: 'when testing',
        kind: 'in-process',
      },
      {
        name: 'orphan',
        version: '1.0.0',
        description: 'No handler registered',
        whenToUse: 'never',
        kind: 'in-process',
      },
    ]);
    skillExecutor.registerHandler<{ msg: string }, { echoed: string }>('echo', (input) => ({
      echoed: input.msg,
    }));

    toolRegistry.replace([
      {
        name: 'get-product',
        version: '1.0.0',
        description: 'Fetch product details',
        whenToUse: 'product lookup',
        method: 'GET',
        urlTemplate: 'https://api.host.com/products/{productId}',
      },
    ]);

    server = new RuntimeServer({
      port: 0,
      composer: new StubComposer(),
      skillRegistry,
      toolRegistry,
      skillExecutor,
      toolExecutor,
    });
    await server.start();
  });

  afterEach(async () => {
    await server.stop();
  });

  it('POST /executor/skill/<name> returns 200 + output for a registered handler', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msg: 'hello' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; output: { echoed: string } };
    expect(body.ok).toBe(true);
    expect(body.output.echoed).toBe('hello');
  });

  it('POST /executor/skill/<unknown> returns 404 with unknown-skill', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/does-not-exist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe('unknown-skill');
  });

  it('POST /executor/skill/<no-handler> returns 400 with no-handler', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/orphan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe('no-handler');
  });

  it('POST /executor/tool/<name> returns 200 + output for a registered tool (via stub fetch)', async () => {
    let calledUrl = '';
    stubFetchImpl = (url) => {
      calledUrl = url;
      return new Response(JSON.stringify({ id: 'tv-55', price: 799 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/tool/get-product`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ productId: 'tv-55' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; output: { price: number } };
    expect(body.ok).toBe(true);
    expect(body.output.price).toBe(799);
    expect(calledUrl).toBe('https://api.host.com/products/tv-55');
  });

  it('POST /executor/tool/<unknown> returns 404 with unknown-tool', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/tool/nope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { ok: false; error: { code: string } };
    expect(body.error.code).toBe('unknown-tool');
  });

  it('POST /executor/tool/<get-product> with missing args returns 400 with missing-input-param', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/tool/get-product`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: false; error: { code: string; message: string } };
    expect(body.error.code).toBe('missing-input-param');
    expect(body.error.message).toMatch(/productId/);
  });

  it('GET /executor/skill/<name> returns 405 with Allow: POST', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/echo`);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
  });

  it('POST /executor/skill/<missing-name> returns 400', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('strips non-serializable cause from wire response on handler-threw', async () => {
    skillExecutor.registerHandler('echo', () => {
      throw new Error('boom');
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/skill/echo`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ msg: 'x' }),
    });
    expect(res.status).toBe(502);
    const body = (await res.json()) as { ok: false; error: { code: string; cause?: unknown } };
    expect(body.error.code).toBe('handler-threw');
    expect(body.error.cause).toBeUndefined();
  });

  it('/health reflects skill + tool registry versions and counts', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = (await res.json()) as {
      skillRegistryVersion: string;
      skillCount: number;
      toolRegistryVersion: string;
      toolCount: number;
      featureRegistryVersion: string;
      featureCount: number;
    };
    expect(body.skillRegistryVersion).toBe('1.0.0');
    expect(body.skillCount).toBe(2);
    expect(body.toolRegistryVersion).toBe('1.0.0');
    expect(body.toolCount).toBe(1);
    // featureRegistry not pre-populated in this beforeEach; defaults to 0.0.0/0.
    expect(body.featureRegistryVersion).toBe('0.0.0');
    expect(body.featureCount).toBe(0);
  });
});

/**
 * Phase 2.2: REST endpoints for the features registry.
 */
describe('RuntimeServer /registry/features endpoints', () => {
  let server: RuntimeServer;

  beforeEach(async () => {
    server = new RuntimeServer({ port: 0, composer: new StubComposer() });
    await server.start();
  });
  afterEach(async () => {
    await server.stop();
  });

  it('GET returns the empty registry initially', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/features`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; features: Record<string, unknown> };
    expect(body).toEqual({ version: '0.0.0', features: {} });
  });

  it('PUT replaces the registry and bumps the version', async () => {
    const features = [
      {
        name: 'product-search',
        version: '1.0.0',
        summary: 'Search the catalog',
        whenRelevant: 'When the user wants to discover products',
        content: '# Product Search',
      },
    ];
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/features`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(features),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; features: Record<string, unknown> };
    expect(body.version).toBe('1.0.0');
    expect(Object.keys(body.features)).toEqual(['product-search']);
  });

  it('PUT ?format=markdown imports a .feature.md document', async () => {
    const md = `---
name: checkout
version: 1.0.0
summary: Cart-to-purchase flow
whenRelevant: When the user is ready to buy
---

# Checkout

Supports credit card, PayPal, Apple Pay.`;
    const res = await fetch(
      `http://127.0.0.1:${server.port}/registry/features?format=markdown`,
      {
        method: 'PUT',
        headers: { 'content-type': 'text/markdown' },
        body: md,
      },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      features: Record<string, { content: string; summary: string }>;
    };
    expect(body.features['checkout']?.summary).toBe('Cart-to-purchase flow');
    expect(body.features['checkout']?.content).toContain('Supports credit card');
  });

  it('PUT ?format=markdown returns 400 for malformed front matter', async () => {
    const res = await fetch(
      `http://127.0.0.1:${server.port}/registry/features?format=markdown`,
      {
        method: 'PUT',
        body: 'no front matter here, just markdown',
      },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/front-matter/);
  });

  it('POST upserts a single FeatureDescriptor', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/features`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'tier-upgrade',
        version: '1.0.0',
        summary: 'Upgrade user to a paid tier',
        whenRelevant: 'When the user hits a free-tier limit',
        content: '# Upgrade',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { features: Record<string, { name: string }> };
    expect(body.features['tier-upgrade']?.name).toBe('tier-upgrade');
  });

  it('POST returns 400 when the body lacks a name', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/features`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ summary: 'no name' }),
    });
    expect(res.status).toBe(400);
  });

  it('DELETE clears the registry', async () => {
    await fetch(`http://127.0.0.1:${server.port}/registry/features`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        { name: 'a', version: '1.0.0', summary: 's', whenRelevant: 'w', content: 'c' },
      ]),
    });
    const del = await fetch(`http://127.0.0.1:${server.port}/registry/features`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(200);
    const body = (await del.json()) as { features: Record<string, unknown> };
    expect(body.features).toEqual({});
  });
});

/**
 * Phase 2.3: /memory/sessions inspection endpoints + per-WS sessionId threading.
 */
describe('RuntimeServer /memory + sessionId threading', () => {
  it('GET /memory/sessions returns the list when provider is KeyValueMemoryProvider', async () => {
    const memory = new KeyValueMemoryProvider();
    await memory.record({ speaker: 'user', text: 'hi from a', at: '2026-01-01T00:00:00Z' }, 'sess-a');
    await memory.record({ speaker: 'user', text: 'hi from b', at: '2026-01-01T00:00:01Z' }, 'sess-b');
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), memoryProvider: memory });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/memory/sessions`);
      expect(res.status).toBe(200);
      const body = (await res.json()) as { sessions: string[] };
      expect(body.sessions.sort()).toEqual(['sess-a', 'sess-b']);
    } finally {
      await server.stop();
    }
  });

  it('GET /memory/sessions/<id> returns the turns for that session', async () => {
    const memory = new KeyValueMemoryProvider();
    await memory.record({ speaker: 'user', text: 'first', at: '2026-01-01T00:00:00Z' }, 'sess-x');
    await memory.record({ speaker: 'agent', text: 'reply', at: '2026-01-01T00:00:01Z' }, 'sess-x');
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), memoryProvider: memory });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/memory/sessions/sess-x`);
      const body = (await res.json()) as {
        sessionId: string;
        turns: Array<{ speaker: string; text: string }>;
      };
      expect(body.sessionId).toBe('sess-x');
      expect(body.turns).toHaveLength(2);
      expect(body.turns[0]!.text).toBe('first');
      expect(body.turns[1]!.text).toBe('reply');
    } finally {
      await server.stop();
    }
  });

  it('DELETE /memory/sessions/<id> drops one session', async () => {
    const memory = new KeyValueMemoryProvider();
    await memory.record({ speaker: 'user', text: 'x', at: '2026-01-01T00:00:00Z' }, 'sess-d');
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), memoryProvider: memory });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/memory/sessions/sess-d`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { cleared: boolean };
      expect(body.cleared).toBe(true);
      const after = await fetch(`http://127.0.0.1:${server.port}/memory/sessions/sess-d`, {
        method: 'DELETE',
      });
      expect(after.status).toBe(404);
    } finally {
      await server.stop();
    }
  });

  it('returns 501 from /memory endpoints when provider does not support inspection', async () => {
    const server = new RuntimeServer({
      port: 0,
      composer: new StubComposer(),
      memoryProvider: new NullMemoryProvider(),
    });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/memory/sessions`);
      expect(res.status).toBe(501);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/null/);
    } finally {
      await server.stop();
    }
  });

  it('threads a per-WS sessionId into PlanRequest.sessionId', async () => {
    const seen: string[] = [];
    const planner: Planner = {
      name: 'capture',
      plan: async (req) => {
        if (req.sessionId) seen.push(req.sessionId);
        return { intent: req.envelope.type, invocations: [] };
      },
    };
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), planner });
    await server.start();
    try {
      // Open SSE so welcome layout fires + we have a composeCycleId.
      const layouts: ComposedLayout[] = [];
      const sse = new EventSource(`http://127.0.0.1:${server.port}/sse`);
      sse.addEventListener('layout', (e) => {
        layouts.push(JSON.parse((e as MessageEvent).data) as ComposedLayout);
      });
      await waitFor(() => layouts.length >= 1, 1500);

      // Two messages on the SAME ws → same sessionId
      const ws1 = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
      await new Promise<void>((r) => ws1.once('open', () => r()));
      const env = {
        composeCycleId: layouts[0]!.composeCycleId,
        sourceNodeId: 'user-input',
        emittedAt: new Date().toISOString(),
        type: 'msg',
        sequence: 0,
        payload: {},
      };
      ws1.send(JSON.stringify(env));
      ws1.send(JSON.stringify(env));
      await waitFor(() => seen.length >= 2, 1500);
      expect(seen[0]).toBe(seen[1]);
      expect(seen[0]).toMatch(/^sess-/);

      // New ws → different sessionId
      const ws2 = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
      await new Promise<void>((r) => ws2.once('open', () => r()));
      ws2.send(JSON.stringify(env));
      await waitFor(() => seen.length >= 3, 1500);
      expect(seen[2]).not.toBe(seen[0]);
      expect(seen[2]).toMatch(/^sess-/);

      ws1.close();
      ws2.close();
      sse.close();
    } finally {
      await server.stop();
    }
  });

  it('/health includes memoryProvider.name', async () => {
    const server = new RuntimeServer({
      port: 0,
      composer: new StubComposer(),
      memoryProvider: new KeyValueMemoryProvider(),
    });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/health`);
      const body = (await res.json()) as { memoryProvider: string };
      expect(body.memoryProvider).toBe('keyvalue');
    } finally {
      await server.stop();
    }
  });
});

/**
 * Phase 2.4: /registry/subagents + /executor/subagent/* + /health subagent counts.
 */
describe('RuntimeServer sub-agent endpoints', () => {
  let server: RuntimeServer;
  let stubFetchImpl: (url: string, init?: RequestInit) => Promise<Response> | Response;

  beforeEach(async () => {
    const subAgentRegistry = new InMemorySubAgentRegistry();
    stubFetchImpl = () =>
      new Response(JSON.stringify({ output: { default: true } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    const subAgentExecutor = new SubAgentExecutor({
      registry: subAgentRegistry,
      fetch: ((input: RequestInfo | URL, init?: RequestInit) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : (input as Request).url;
        return Promise.resolve(stubFetchImpl(url, init));
      }) as typeof globalThis.fetch,
    });
    server = new RuntimeServer({
      port: 0,
      composer: new StubComposer(),
      subAgentRegistry,
      subAgentExecutor,
    });
    await server.start();
  });
  afterEach(async () => {
    await server.stop();
  });

  it('GET /registry/subagents returns the empty registry initially', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/subagents`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; subAgents: Record<string, unknown> };
    expect(body).toEqual({ version: '0.0.0', subAgents: {} });
  });

  it('PUT /registry/subagents replaces the registry and bumps version', async () => {
    const subs = [
      {
        name: 'travel',
        version: '1.0.0',
        description: 'Travel specialist',
        whenToUse: 'when booking travel',
        transport: 'http',
        endpoint: 'https://travel.host.com/federate',
      },
    ];
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(subs),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { version: string; subAgents: Record<string, unknown> };
    expect(body.version).toBe('1.0.0');
    expect(Object.keys(body.subAgents)).toEqual(['travel']);
  });

  it('POST /registry/subagents upserts a single SubAgentDescriptor', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'billing',
        version: '1.0.0',
        description: 'Billing specialist',
        whenToUse: 'for refunds',
        transport: 'http',
        endpoint: 'https://billing.host.com/federate',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { subAgents: Record<string, { name: string }> };
    expect(body.subAgents['billing']?.name).toBe('billing');
  });

  it('DELETE /registry/subagents clears the registry', async () => {
    await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify([
        {
          name: 'a',
          version: '1.0.0',
          description: 'd',
          whenToUse: 'w',
          transport: 'http',
          endpoint: 'https://a/federate',
        },
      ]),
    });
    const del = await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'DELETE',
    });
    expect(del.status).toBe(200);
    const body = (await del.json()) as { subAgents: Record<string, unknown> };
    expect(body.subAgents).toEqual({});
  });

  it('POST /executor/subagent/<name> dispatches via SubAgentExecutor (stub fetch)', async () => {
    // Register the descriptor first.
    await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'travel',
        version: '1.0.0',
        description: 'Travel specialist',
        whenToUse: 'when booking travel',
        transport: 'http',
        endpoint: 'https://travel.host.com/federate',
      }),
    });
    let receivedBody = '';
    stubFetchImpl = (_url, init) => {
      receivedBody = String(init?.body ?? '');
      return new Response(JSON.stringify({ narration: 'Booked.', output: { id: 'X' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    };
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/subagent/travel`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'book SFO to NRT', payload: { from: 'SFO', to: 'NRT' } }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: true; output: { narration: string } };
    expect(body.ok).toBe(true);
    expect(body.output.narration).toBe('Booked.');
    expect(JSON.parse(receivedBody).intent).toBe('book SFO to NRT');
  });

  it('POST /executor/subagent/<unknown> returns 404', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/executor/subagent/nope`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ intent: 'x' }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('unknown-tool');
  });

  it('/health includes subAgentRegistryVersion + subAgentCount', async () => {
    await fetch(`http://127.0.0.1:${server.port}/registry/subagents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'travel',
        version: '1.0.0',
        description: 'd',
        whenToUse: 'w',
        transport: 'http',
        endpoint: 'https://travel/federate',
      }),
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = (await res.json()) as {
      subAgentRegistryVersion: string;
      subAgentCount: number;
    };
    expect(body.subAgentRegistryVersion).toBe('1.0.0');
    expect(body.subAgentCount).toBe(1);
  });
});

/**
 * Phase 2.4.x: /federate endpoint — symmetric federation, any runtime can serve as a sub-agent.
 */
describe('RuntimeServer /federate endpoint', () => {
  it('synthesizes a user-message envelope from FederationRequest.intent and returns planner narration', async () => {
    const planner: Planner = {
      name: 'capture',
      plan: async (req) => {
        const text = (req.envelope.payload as { text?: string } | undefined)?.text ?? '';
        return {
          intent: text,
          invocations: [],
          narration: `child-runtime acknowledges: ${text}`,
        };
      },
    };
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), planner });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/federate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'tell me a joke' }),
      });
      expect(res.status).toBe(200);
      const body = (await res.json()) as { narration?: string; output?: unknown };
      expect(body.narration).toBe('child-runtime acknowledges: tell me a joke');
      expect(body.output).toBeUndefined();
    } finally {
      await server.stop();
    }
  });

  it('returns invocations + aggregated output when the planner ran tools', async () => {
    const planner: Planner = {
      name: 'with-tools',
      plan: async () => ({
        intent: 'x',
        invocations: [
          {
            name: 'get-weather',
            kind: 'tool',
            input: { city: 'Tokyo' },
            result: { ok: true, output: { tempC: 18, conditions: 'cloudy' }, durationMs: 200 },
          },
        ],
        narration: 'fetched weather for Tokyo',
      }),
    };
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), planner });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/federate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'weather in Tokyo' }),
      });
      const body = (await res.json()) as {
        narration?: string;
        output?: { tempC: number; conditions: string };
        invocations?: Array<{ name: string; ok: boolean; durationMs: number }>;
      };
      expect(body.narration).toBe('fetched weather for Tokyo');
      expect(body.output).toEqual({ tempC: 18, conditions: 'cloudy' });
      expect(body.invocations).toHaveLength(1);
      expect(body.invocations![0]).toMatchObject({ name: 'get-weather', ok: true, durationMs: 200 });
    } finally {
      await server.stop();
    }
  });

  it('returns 400 when the body is missing intent', async () => {
    const server = new RuntimeServer({ port: 0, composer: new StubComposer() });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/federate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ payload: {} }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('bad-request');
      expect(body.error.message).toMatch(/intent/);
    } finally {
      await server.stop();
    }
  });

  it('returns 500 with FederationResponse.error.code=plan-failed when the planner throws', async () => {
    const planner: Planner = {
      name: 'failing',
      // eslint-disable-next-line @typescript-eslint/require-await
      plan: async () => {
        throw new Error('planner blew up');
      },
    };
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), planner });
    await server.start();
    try {
      const res = await fetch(`http://127.0.0.1:${server.port}/federate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'go' }),
      });
      expect(res.status).toBe(500);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('plan-failed');
      expect(body.error.message).toMatch(/planner blew up/);
    } finally {
      await server.stop();
    }
  });

  it('threads FederationRequest.sessionId into PlanRequest.sessionId', async () => {
    let seen = '';
    const planner: Planner = {
      name: 'sid-capture',
      plan: async (req) => {
        seen = req.sessionId ?? '<none>';
        return { intent: 'x', invocations: [] };
      },
    };
    const server = new RuntimeServer({ port: 0, composer: new StubComposer(), planner });
    await server.start();
    try {
      await fetch(`http://127.0.0.1:${server.port}/federate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ intent: 'go', sessionId: 'remote-sess-42' }),
      });
      expect(seen).toBe('remote-sess-42');
    } finally {
      await server.stop();
    }
  });
});

/**
 * Phase 2.5: /eval REST endpoints + WS eval-feedback intercept.
 */
describe('RuntimeServer /eval endpoints + eval-feedback WS intercept', () => {
  let evalProvider: KeyValueEvalProvider;
  let server: RuntimeServer;

  beforeEach(async () => {
    evalProvider = new KeyValueEvalProvider();
    server = new RuntimeServer({ port: 0, composer: new StubComposer(), evalProvider });
    await server.start();
  });
  afterEach(async () => {
    await server.stop();
  });

  it('POST /eval records a signal (server stamps `at` if missing)', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/eval`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        composeCycleId: 'cyc-1',
        signal: 'positive',
        source: 'user-explicit',
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recorded: boolean; total: number };
    expect(body.recorded).toBe(true);
    expect(body.total).toBe(1);
    const stored = await evalProvider.query({});
    expect(stored).toHaveLength(1);
    expect(stored[0]!.composeCycleId).toBe('cyc-1');
    expect(typeof stored[0]!.at).toBe('string');
    expect(stored[0]!.at.length).toBeGreaterThan(10);
  });

  it('POST /eval returns 400 on missing required fields', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/eval`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ signal: 'positive' }),
    });
    expect(res.status).toBe(400);
  });

  it('GET /eval returns all signals with most-recent-first ordering', async () => {
    await evalProvider.record({
      composeCycleId: 'a',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-02T00:00:00Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/eval`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signals: Array<{ composeCycleId: string }>; total: number };
    expect(body.total).toBe(2);
    expect(body.signals.map((s) => s.composeCycleId)).toEqual(['b', 'a']);
  });

  it('GET /eval supports filter query params (signal=)', async () => {
    await evalProvider.record({
      composeCycleId: 'a',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-02T00:00:00Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/eval?signal=negative`);
    const body = (await res.json()) as { signals: Array<{ composeCycleId: string }> };
    expect(body.signals).toHaveLength(1);
    expect(body.signals[0]!.composeCycleId).toBe('b');
  });

  it('GET /eval/sessions/<id> returns signals for that session', async () => {
    await evalProvider.record({
      composeCycleId: 'a',
      sessionId: 's1',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b',
      sessionId: 's2',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:01Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/eval/sessions/s1`);
    const body = (await res.json()) as { sessionId: string; signals: Array<{ composeCycleId: string }> };
    expect(body.sessionId).toBe('s1');
    expect(body.signals).toHaveLength(1);
    expect(body.signals[0]!.composeCycleId).toBe('a');
  });

  it('WS eval-feedback envelope is captured into the EvalProvider with the per-WS sessionId (no compose)', async () => {
    // Open SSE so we get a baseline composeCycleId.
    const sseUrl = `http://127.0.0.1:${server.port}/sse`;
    const layouts: ComposedLayout[] = [];
    const sse = new EventSource(sseUrl);
    sse.addEventListener('layout', (e) => {
      layouts.push(JSON.parse((e as MessageEvent).data) as ComposedLayout);
    });
    await waitFor(() => layouts.length >= 1, 1500);

    const ws = new WebSocket(`ws://127.0.0.1:${server.port}/ws`);
    await new Promise<void>((resolve) => ws.once('open', () => resolve()));
    const cycleBefore = layouts.length;
    ws.send(
      JSON.stringify({
        composeCycleId: layouts[0]!.composeCycleId,
        sourceNodeId: 'thumbs-up',
        emittedAt: new Date().toISOString(),
        type: 'eval-feedback',
        sequence: 0,
        payload: { signal: 'positive', source: 'user-explicit', score: 1, comment: 'great UI' },
      }),
    );

    await waitFor(() => evalProvider.count() >= 1, 1500);
    const stored = await evalProvider.query({});
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      composeCycleId: layouts[0]!.composeCycleId,
      signal: 'positive',
      source: 'user-explicit',
      score: 1,
      comment: 'great UI',
    });
    expect(stored[0]!.sessionId).toMatch(/^sess-/);

    // No compose was triggered — layouts.length should still be cycleBefore.
    await new Promise((r) => setTimeout(r, 200));
    expect(layouts.length).toBe(cycleBefore);

    ws.close();
    sse.close();
  });

  it('/health includes evalProvider name + count', async () => {
    await evalProvider.record({
      composeCycleId: 'x',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = (await res.json()) as { evalProvider: string; evalSignalCount: number };
    expect(body.evalProvider).toBe('keyvalue');
    expect(body.evalSignalCount).toBe(1);
  });
});

/**
 * Phase 2.6: /churn endpoints driven by RuleBasedChurnCalculator over an
 * in-process EvalProvider. Same instance shared between the calculator's
 * dependency and the runtime's REST inspection so behavior is consistent.
 */
describe('RuntimeServer /churn endpoints', () => {
  let evalProvider: KeyValueEvalProvider;
  let server: RuntimeServer;

  beforeEach(async () => {
    evalProvider = new KeyValueEvalProvider();
    server = new RuntimeServer({ port: 0, composer: new StubComposer(), evalProvider });
    await server.start();
  });
  afterEach(async () => {
    await server.stop();
  });

  it('GET /churn/sessions/<id> returns 404 when no signals exist for the session', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/churn/sessions/empty`);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { score: null; reason: string };
    expect(body.score).toBeNull();
    expect(body.reason).toMatch(/no eval signals/);
  });

  it('GET /churn/sessions/<id> computes and returns ChurnRiskScore', async () => {
    await evalProvider.record({
      composeCycleId: 'a',
      sessionId: 's-bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b',
      sessionId: 's-bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:01:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'c',
      sessionId: 's-bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:02:00Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/churn/sessions/s-bad`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sessionId: string;
      score: number;
      riskLevel: string;
      signalsAnalyzed: number;
      factors: string[];
      model: string;
    };
    expect(body.sessionId).toBe('s-bad');
    expect(body.signalsAnalyzed).toBe(3);
    expect(body.riskLevel).toBe('high');
    expect(body.score).toBeGreaterThanOrEqual(0.6);
    expect(body.factors.length).toBeGreaterThan(0);
    expect(body.model).toBe('rule-based-v0');
  });

  it('GET /churn returns scores for every session sorted by score DESC', async () => {
    // Session A — low risk (positive + completion)
    await evalProvider.record({
      composeCycleId: 'a1',
      sessionId: 'good',
      signal: 'positive',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'a2',
      sessionId: 'good',
      signal: 'completion',
      source: 'user-explicit',
      at: '2026-01-01T00:01:00Z',
    });
    // Session B — high risk
    await evalProvider.record({
      composeCycleId: 'b1',
      sessionId: 'bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:00:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b2',
      sessionId: 'bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:01:00Z',
    });
    await evalProvider.record({
      composeCycleId: 'b3',
      sessionId: 'bad',
      signal: 'negative',
      source: 'user-explicit',
      at: '2026-01-01T00:02:00Z',
    });
    const res = await fetch(`http://127.0.0.1:${server.port}/churn`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      scores: Array<{ sessionId: string; riskLevel: string; score: number }>;
      model: string;
    };
    expect(body.scores).toHaveLength(2);
    expect(body.scores[0]!.sessionId).toBe('bad');
    expect(body.scores[0]!.riskLevel).toBe('high');
    expect(body.scores[1]!.sessionId).toBe('good');
    expect(body.scores[1]!.riskLevel).toBe('low');
    expect(body.scores[0]!.score).toBeGreaterThan(body.scores[1]!.score);
    expect(body.model).toBe('rule-based-v0');
  });

  it('/health includes churnCalculator name', async () => {
    const res = await fetch(`http://127.0.0.1:${server.port}/health`);
    const body = (await res.json()) as { churnCalculator: string };
    expect(body.churnCalculator).toBe('rule-based-v0');
  });
});
