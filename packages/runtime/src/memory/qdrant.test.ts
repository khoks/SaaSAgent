import { describe, it, expect, vi } from 'vitest';
import { QdrantMemoryProvider, type EmbeddingFn } from './qdrant.js';

function stubFetch(impl: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    return Promise.resolve(impl(url, init));
  }) as typeof globalThis.fetch;
}

const constantEmbed: EmbeddingFn = async () => Array.from({ length: 4 }, (_, i) => i * 0.1);

describe('QdrantMemoryProvider', () => {
  it('reports its name', () => {
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed: constantEmbed, fetch: stubFetch(() => new Response('', { status: 200 })) });
    expect(p.name).toBe('qdrant');
  });

  it('ensureCollection probes then creates if missing', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const fetcher = stubFetch((url, init) => {
      calls.push({ url, method: init?.method ?? 'GET' });
      // First call (GET probe) → 404; second (PUT create) → 200
      if (calls.length === 1) return new Response('not found', { status: 404 });
      return new Response('{}', { status: 200 });
    });
    const p = new QdrantMemoryProvider({
      url: 'http://localhost:6333',
      embed: constantEmbed,
      fetch: fetcher,
      autoCreate: false,
    });
    await p.ensureCollection();
    expect(calls).toHaveLength(2);
    expect(calls[0]!.method).toBe('GET');
    expect(calls[1]!.method).toBe('PUT');
    expect(calls[1]!.url).toMatch(/\/collections\/saasagent_turns$/);
  });

  it('ensureCollection skips create when collection already exists', async () => {
    const calls: Array<string> = [];
    const fetcher = stubFetch((url) => {
      calls.push(url);
      return new Response(JSON.stringify({ result: { name: 'saasagent_turns' } }), { status: 200 });
    });
    const p = new QdrantMemoryProvider({
      url: 'http://localhost:6333',
      embed: constantEmbed,
      fetch: fetcher,
      autoCreate: false,
    });
    await p.ensureCollection();
    expect(calls).toHaveLength(1); // only the probe
  });

  it('record() embeds + PUTs the point with payload', async () => {
    let receivedBody: string = '';
    const fetcher = stubFetch((url, init) => {
      if (url.endsWith('/collections/saasagent_turns')) return new Response('{}', { status: 200 });
      receivedBody = String(init?.body ?? '');
      return new Response('{"status":"ok"}', { status: 200 });
    });
    const embed: EmbeddingFn = vi.fn(async () => [0.1, 0.2, 0.3]);
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed, fetch: fetcher });
    await p.record({ speaker: 'user', text: 'hi there', at: '2026-01-01T00:00:00Z' }, 's1');
    expect(embed).toHaveBeenCalledWith('hi there');
    const body = JSON.parse(receivedBody);
    expect(body.points).toHaveLength(1);
    expect(body.points[0].vector).toEqual([0.1, 0.2, 0.3]);
    expect(body.points[0].payload).toMatchObject({
      speaker: 'user',
      text: 'hi there',
      at: '2026-01-01T00:00:00Z',
      sessionId: 's1',
    });
  });

  it('recall() embeds query, calls /points/search with sessionId filter', async () => {
    let searchBody: string = '';
    const fetcher = stubFetch((url, init) => {
      if (url.endsWith('/collections/saasagent_turns')) return new Response('{}', { status: 200 });
      if (url.endsWith('/points/search')) {
        searchBody = String(init?.body ?? '');
        return new Response(
          JSON.stringify({
            result: [
              { id: 1, score: 0.95, payload: { speaker: 'user', text: 'related earlier turn', at: '2026-01-01T00:00:00Z' } },
              { id: 2, score: 0.81, payload: { speaker: 'agent', text: 'second match', at: '2026-01-01T00:01:00Z' } },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response('', { status: 404 });
    });
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed: constantEmbed, fetch: fetcher });
    const r = await p.recall({ text: 'find similar', sessionId: 's1', limit: 5 });
    expect(r).toHaveLength(2);
    expect(r[0]!.store).toBe('qdrant');
    expect(r[0]!.summary).toContain('related earlier turn');
    expect(r[0]!.summary).toContain('score=0.950');
    const body = JSON.parse(searchBody);
    expect(body.vector).toHaveLength(4);
    expect(body.vector[0]).toBe(0);
    expect(body.limit).toBe(5);
    expect(body.filter.must[0].key).toBe('sessionId');
    expect(body.filter.must[0].match.value).toBe('s1');
  });

  it('recall() omits filter when no sessionId given', async () => {
    let searchBody = '';
    const fetcher = stubFetch((url, init) => {
      if (url.endsWith('/collections/saasagent_turns')) return new Response('{}', { status: 200 });
      if (url.endsWith('/points/search')) {
        searchBody = String(init?.body ?? '');
        return new Response(JSON.stringify({ result: [] }), { status: 200 });
      }
      return new Response('', { status: 404 });
    });
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed: constantEmbed, fetch: fetcher });
    await p.recall({ text: 'anything' });
    const body = JSON.parse(searchBody);
    expect(body.filter).toBeUndefined();
  });

  it('recall() returns empty when text is empty', async () => {
    const fetcher = stubFetch(() => new Response('', { status: 200 }));
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed: constantEmbed, fetch: fetcher });
    expect(await p.recall({ text: '' })).toEqual([]);
  });

  it('recall() soft-fails on Qdrant error and returns empty', async () => {
    const fetcher = stubFetch((url) => {
      if (url.endsWith('/collections/saasagent_turns')) return new Response('{}', { status: 200 });
      return new Response('upstream broken', { status: 503 });
    });
    const p = new QdrantMemoryProvider({ url: 'http://localhost:6333', embed: constantEmbed, fetch: fetcher });
    const r = await p.recall({ text: 'go' });
    expect(r).toEqual([]);
  });

  it('attaches api-key header when configured', async () => {
    let headers: Record<string, string> = {};
    const fetcher = stubFetch((_url, init) => {
      headers = (init?.headers ?? {}) as Record<string, string>;
      return new Response('{}', { status: 200 });
    });
    const p = new QdrantMemoryProvider({
      url: 'http://localhost:6333',
      embed: constantEmbed,
      apiKey: 'secret-token',
      fetch: fetcher,
      autoCreate: false,
    });
    await p.ensureCollection();
    expect(headers['api-key']).toBe('secret-token');
  });

  it('honors custom collection name + vectorSize', async () => {
    let createBody = '';
    const fetcher = stubFetch((url, init) => {
      if (init?.method === 'PUT' && url.endsWith('/collections/my-custom')) {
        createBody = String(init.body);
        return new Response('{}', { status: 200 });
      }
      return new Response('not found', { status: 404 });
    });
    const p = new QdrantMemoryProvider({
      url: 'http://localhost:6333',
      collection: 'my-custom',
      vectorSize: 384,
      distance: 'Dot',
      embed: constantEmbed,
      fetch: fetcher,
      autoCreate: false,
    });
    await p.ensureCollection();
    const body = JSON.parse(createBody);
    expect(body.vectors.size).toBe(384);
    expect(body.vectors.distance).toBe('Dot');
  });
});
