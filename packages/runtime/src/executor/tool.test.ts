import { describe, it, expect } from 'vitest';
import type { ToolDescriptor } from '@saasagent/protocol';
import { InMemoryToolRegistry } from '../registry/tools.js';
import { ToolExecutor, substituteUrl } from './tool.js';

const getProduct: ToolDescriptor = {
  name: 'get-product',
  version: '1.0.0',
  description: 'Fetch product details',
  whenToUse: 'when the planner needs product details',
  method: 'GET',
  urlTemplate: 'https://api.host.com/products/{productId}',
};

const addToCart: ToolDescriptor = {
  name: 'add-to-cart',
  version: '1.0.0',
  description: 'Add an item to the cart',
  whenToUse: 'when the user wants to buy',
  method: 'POST',
  urlTemplate: 'https://api.host.com/cart',
};

const billingTool: ToolDescriptor = {
  name: 'billing',
  version: '1.0.0',
  description: 'Bearer-protected billing endpoint',
  whenToUse: 'when refunding',
  method: 'GET',
  urlTemplate: 'https://api.host.com/billing/{customerId}',
  auth: 'bearer-env',
  authEnvVar: 'BILLING_TOKEN',
};

const slowTool: ToolDescriptor = {
  ...getProduct,
  name: 'slow-tool',
  timeoutMs: 50,
};

function makeRegistry(tools: ReadonlyArray<ToolDescriptor>): InMemoryToolRegistry {
  const r = new InMemoryToolRegistry();
  r.replace(tools);
  return r;
}

/** Build a fetch stub that returns a fixed Response for any URL. */
function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return Promise.resolve(impl(url, init));
  }) as typeof globalThis.fetch;
}

describe('substituteUrl', () => {
  it('replaces a single param', () => {
    const r = substituteUrl('https://x/products/{id}', { id: 'tv-55' });
    expect(r.url).toBe('https://x/products/tv-55');
    expect(r.missing).toEqual([]);
  });

  it('replaces multiple params', () => {
    const r = substituteUrl('https://x/{a}/{b}', { a: 'p', b: 'q' });
    expect(r.url).toBe('https://x/p/q');
  });

  it('supports nested dot.notation', () => {
    const r = substituteUrl('https://x/{user.id}/{user.region}', {
      user: { id: '7', region: 'us-east' },
    });
    expect(r.url).toBe('https://x/7/us-east');
  });

  it('reports missing params and leaves the placeholder intact', () => {
    const r = substituteUrl('https://x/{a}/{b}', { a: 'one' });
    expect(r.missing).toEqual(['b']);
    expect(r.url).toBe('https://x/one/{b}');
  });

  it('encodes special chars in the value', () => {
    const r = substituteUrl('https://x/{q}', { q: 'a b/c' });
    expect(r.url).toBe('https://x/a%20b%2Fc');
  });
});

describe('ToolExecutor', () => {
  it('returns unknown-tool when no descriptor exists', async () => {
    const ex = new ToolExecutor({ registry: makeRegistry([]) });
    const r = await ex.execute('nope', {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('unknown-tool');
  });

  it('GET success: substitutes URL and returns parsed JSON', async () => {
    let calledUrl = '';
    let calledMethod = '';
    const fetcher = stubFetch((url, init) => {
      calledUrl = url;
      calledMethod = String(init?.method ?? 'GET');
      return new Response(JSON.stringify({ id: 'tv-55', price: 799 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: fetcher });
    const r = await ex.execute<{ productId: string }, { id: string; price: number }>('get-product', {
      productId: 'tv-55',
    });
    expect(calledUrl).toBe('https://api.host.com/products/tv-55');
    expect(calledMethod).toBe('GET');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toEqual({ id: 'tv-55', price: 799 });
  });

  it('POST success: sends JSON body + content-type header', async () => {
    let receivedBody = '';
    let receivedCt = '';
    const fetcher = stubFetch((_url, init) => {
      receivedBody = String(init?.body ?? '');
      const headers = (init?.headers ?? {}) as Record<string, string>;
      receivedCt = headers['content-type'] ?? '';
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new ToolExecutor({ registry: makeRegistry([addToCart]), fetch: fetcher });
    const r = await ex.execute('add-to-cart', { productId: 'tv-55', qty: 1 });
    expect(receivedBody).toBe(JSON.stringify({ productId: 'tv-55', qty: 1 }));
    expect(receivedCt).toBe('application/json');
    expect(r.ok).toBe(true);
  });

  it('returns missing-input-param when URL template needs args not in input', async () => {
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: stubFetch(() => new Response('')) });
    const r = await ex.execute('get-product', {});
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('missing-input-param');
      expect(r.error.message).toMatch(/productId/);
    }
  });

  it('returns http-status with the status code on a non-2xx response', async () => {
    const fetcher = stubFetch(() => new Response('upstream rate-limited', { status: 429 }));
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: fetcher });
    const r = await ex.execute('get-product', { productId: 'tv-55' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('http-status');
      expect(r.error.status).toBe(429);
      expect(r.error.message).toMatch(/upstream rate-limited/);
    }
  });

  it('attaches Authorization: Bearer for bearer-env auth using injected env', async () => {
    let auth = '';
    const fetcher = stubFetch((_url, init) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      auth = headers['authorization'] ?? '';
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new ToolExecutor({
      registry: makeRegistry([billingTool]),
      fetch: fetcher,
      env: (n) => (n === 'BILLING_TOKEN' ? 'sk-test-123' : undefined),
    });
    const r = await ex.execute('billing', { customerId: 'cus_42' });
    expect(r.ok).toBe(true);
    expect(auth).toBe('Bearer sk-test-123');
  });

  it('returns tool-config when bearer-env env var is unset', async () => {
    const ex = new ToolExecutor({
      registry: makeRegistry([billingTool]),
      fetch: stubFetch(() => new Response('')),
      env: () => undefined,
    });
    const r = await ex.execute('billing', { customerId: 'cus_42' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('tool-config');
      expect(r.error.message).toMatch(/BILLING_TOKEN/);
    }
  });

  it('returns timeout when descriptor.timeoutMs elapses', async () => {
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
    const ex = new ToolExecutor({ registry: makeRegistry([slowTool]), fetch: fetcher });
    const r = await ex.execute('slow-tool', { productId: 'tv-55' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('timeout');
      expect(r.error.message).toMatch(/50ms/);
    }
  });

  it('returns http-network for fetch rejections that are not aborts', async () => {
    const fetcher = stubFetch(() => {
      throw new Error('ECONNREFUSED');
    });
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: fetcher });
    const r = await ex.execute('get-product', { productId: 'tv-55' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe('http-network');
      expect(r.error.message).toBe('ECONNREFUSED');
    }
  });

  it('returns invalid-json when JSON content-type body fails to parse', async () => {
    const fetcher = stubFetch(
      () =>
        new Response('not-json{{{', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    );
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: fetcher });
    const r = await ex.execute('get-product', { productId: 'tv-55' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('invalid-json');
  });

  it('falls back to text() for non-JSON content-type responses', async () => {
    const fetcher = stubFetch(
      () => new Response('hello world', { status: 200, headers: { 'content-type': 'text/plain' } }),
    );
    const ex = new ToolExecutor({ registry: makeRegistry([getProduct]), fetch: fetcher });
    const r = await ex.execute<unknown, string>('get-product', { productId: 'tv-55' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.output).toBe('hello world');
  });

  it('merges ctx.hostHeaders for auth=host-supplied tools', async () => {
    const tool: ToolDescriptor = {
      ...getProduct,
      name: 'host-auth',
      auth: 'host-supplied',
    };
    let received: Record<string, string> = {};
    const fetcher = stubFetch((_url, init) => {
      received = (init?.headers ?? {}) as Record<string, string>;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const ex = new ToolExecutor({ registry: makeRegistry([tool]), fetch: fetcher });
    await ex.execute('host-auth', { productId: 'p' }, { hostHeaders: { 'x-session': 'sess-9' } });
    expect(received['x-session']).toBe('sess-9');
  });
});
