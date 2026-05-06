import { describe, it, expect } from 'vitest';
import type { SubAgentDescriptor } from '@saasagent/protocol';

import { InMemorySubAgentRegistry } from '../registry/subagents.js';
import { SubAgentExecutor } from './subagent.js';

const travel: SubAgentDescriptor = {
  name: 'travel',
  version: '1.0.0',
  description: 'Travel specialist',
  whenToUse: 'when the user wants to book travel',
  transport: 'http',
  endpoint: 'https://travel-agent.host.com/federate',
};

const bearerOne: SubAgentDescriptor = {
  ...travel,
  name: 'bearer-one',
  auth: 'bearer-env',
  authEnvVar: 'TRAVEL_TOKEN',
};

function makeRegistry(subs: ReadonlyArray<SubAgentDescriptor>): InMemorySubAgentRegistry {
  const r = new InMemorySubAgentRegistry();
  r.replace(subs);
  return r;
}

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return Promise.resolve(impl(url, init));
  }) as typeof globalThis.fetch;
}

describe('SubAgentExecutor', () => {
  it('returns unknown-tool when descriptor is missing', async () => {
    const ex = new SubAgentExecutor({ registry: makeRegistry([]) });
    const r = await ex.execute('nope', { intent: 'go' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('unknown-tool');
  });

  it('POSTs a FederationRequest and parses the FederationResponse', async () => {
    let capturedUrl = '';
    let capturedBody = '';
    const fetcher = stubFetch((url, init) => {
      capturedUrl = url;
      capturedBody = String(init?.body ?? '');
      return new Response(
        JSON.stringify({
          narration: 'Booked.',
          output: { ticketId: 'ABC123' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    const ex = new SubAgentExecutor({ registry: makeRegistry([travel]), fetch: fetcher });
    const r = await ex.execute('travel', {
      intent: 'book SFO to NRT next month',
      payload: { from: 'SFO', to: 'NRT', month: '2026-06' },
      sessionId: 'sess-1',
    });
    expect(capturedUrl).toBe('https://travel-agent.host.com/federate');
    expect(JSON.parse(capturedBody)).toEqual({
      intent: 'book SFO to NRT next month',
      payload: { from: 'SFO', to: 'NRT', month: '2026-06' },
      sessionId: 'sess-1',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.output.narration).toBe('Booked.');
      expect((r.output.output as { ticketId: string }).ticketId).toBe('ABC123');
    }
  });

  it('reports an HTTP error as http-status with the response status code', async () => {
    const fetcher = stubFetch(() => new Response('boom', { status: 503 }));
    const ex = new SubAgentExecutor({ registry: makeRegistry([travel]), fetch: fetcher });
    const r = await ex.execute('travel', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('http-status');
      expect(r.error.status).toBe(503);
      expect(r.error.message).toMatch(/boom/);
    }
  });

  it('returns invalid-json when response body is not valid JSON', async () => {
    const fetcher = stubFetch(
      () => new Response('not-json', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    const ex = new SubAgentExecutor({ registry: makeRegistry([travel]), fetch: fetcher });
    const r = await ex.execute('travel', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('invalid-json');
  });

  it('treats sub-agent FederationResponse.error as a failed result', async () => {
    const fetcher = stubFetch(
      () =>
        new Response(JSON.stringify({ error: { code: 'no-availability', message: 'No flights found' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const ex = new SubAgentExecutor({ registry: makeRegistry([travel]), fetch: fetcher });
    const r = await ex.execute('travel', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('handler-threw');
      expect(r.error.message).toMatch(/no-availability/);
      expect(r.error.message).toMatch(/No flights found/);
    }
  });

  it('attaches Authorization header for auth=bearer-env', async () => {
    let received: Record<string, string> = {};
    const fetcher = stubFetch((_url, init) => {
      received = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({ output: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new SubAgentExecutor({
      registry: makeRegistry([bearerOne]),
      fetch: fetcher,
      env: (n) => (n === 'TRAVEL_TOKEN' ? 'tok-42' : undefined),
    });
    const r = await ex.execute('bearer-one', { intent: 'x' });
    expect(r.ok).toBe(true);
    expect(received['authorization']).toBe('Bearer tok-42');
  });

  it('returns tool-config when bearer-env env var is unset', async () => {
    const ex = new SubAgentExecutor({
      registry: makeRegistry([bearerOne]),
      fetch: stubFetch(() => new Response('')),
      env: () => undefined,
    });
    const r = await ex.execute('bearer-one', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('tool-config');
      expect(r.error.message).toMatch(/TRAVEL_TOKEN/);
    }
  });

  it('returns timeout when the call exceeds descriptor.timeoutMs', async () => {
    const slow: SubAgentDescriptor = { ...travel, name: 'slow', timeoutMs: 50 };
    const fetcher = stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }),
    );
    const ex = new SubAgentExecutor({ registry: makeRegistry([slow]), fetch: fetcher });
    const r = await ex.execute('slow', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('timeout');
      expect(r.error.message).toMatch(/50ms/);
    }
  });

  it('rejects unsupported transports', async () => {
    const grpc: SubAgentDescriptor = { ...travel, name: 'grpc-one', transport: 'grpc' };
    const ex = new SubAgentExecutor({ registry: makeRegistry([grpc]) });
    const r = await ex.execute('grpc-one', { intent: 'x' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('unsupported-kind');
  });

  it('forwards prefetched skill/tool results in the FederationRequest', async () => {
    let bodyJson: { prefetched?: unknown } = {};
    const fetcher = stubFetch((_url, init) => {
      bodyJson = JSON.parse(String(init?.body ?? '{}'));
      return new Response(JSON.stringify({ output: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new SubAgentExecutor({ registry: makeRegistry([travel]), fetch: fetcher });
    await ex.execute('travel', {
      intent: 'x',
      prefetched: [{ name: 'get-product', kind: 'tool', output: { price: 749 } }],
    });
    expect(bodyJson.prefetched).toEqual([
      { name: 'get-product', kind: 'tool', output: { price: 749 } },
    ]);
  });
});
