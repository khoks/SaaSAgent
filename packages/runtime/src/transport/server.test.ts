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
import { InMemorySkillRegistry, InMemoryToolRegistry } from '../registry/index.js';
import { SkillExecutor, ToolExecutor } from '../executor/index.js';
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
    };
    expect(body.skillRegistryVersion).toBe('1.0.0');
    expect(body.skillCount).toBe(2);
    expect(body.toolRegistryVersion).toBe('1.0.0');
    expect(body.toolCount).toBe(1);
  });
});
