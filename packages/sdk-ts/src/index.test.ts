import { describe, it, expect, vi } from 'vitest';
import { VERSION, defineSubAgent } from './index.js';

describe('@saasagent/sdk-ts', () => {
  it('exports a version', () => {
    expect(VERSION).toBe('0.1.0');
  });

  it('defineSubAgent constructs a runtime, registers skills+tools+features, and exposes the app', async () => {
    const app = await defineSubAgent({
      name: 'weather-specialist',
      description: 'Specialist for weather lookups.',
      whenToUse: 'when the user asks about weather',
      skills: [
        {
          descriptor: {
            name: 'fetch-weather',
            version: '1.0.0',
            description: 'Look up current weather',
            whenToUse: 'when asked about weather',
            kind: 'in-process',
          },
          handler: async () => ({ tempC: 18 }),
        },
      ],
      tools: [
        {
          name: 'noaa',
          version: '1.0.0',
          description: 'NOAA weather feed',
          whenToUse: 'for US zip codes',
          method: 'GET',
          urlTemplate: 'https://api.weather.gov/points/{zip}',
        },
      ],
      features: [
        {
          name: 'weather-domain',
          version: '1.0.0',
          summary: 'Conventions for weather queries',
          whenRelevant: 'always',
          content: '# Weather domain',
        },
      ],
    });

    expect(app.name).toBe('weather-specialist');
    expect(app.runtime.skillRegistry.get().skills['fetch-weather']?.name).toBe('fetch-weather');
    expect(app.runtime.toolRegistry.get().tools['noaa']?.urlTemplate).toBe(
      'https://api.weather.gov/points/{zip}',
    );
    expect(app.runtime.featureRegistry.get().features['weather-domain']?.summary).toBe(
      'Conventions for weather queries',
    );

    // SkillExecutor should have the handler — invoke and check.
    const execRes = await app.runtime.skillExecutor.execute('fetch-weather', { city: 'Tokyo' });
    expect(execRes.ok).toBe(true);
    if (execRes.ok) {
      expect(execRes.output).toEqual({ tempC: 18 });
    }
  });

  it('start() and stop() drive the underlying Runtime lifecycle', async () => {
    const app = await defineSubAgent({ name: 'tiny' });
    const startSpy = vi.spyOn(app.runtime, 'start').mockResolvedValue(undefined);
    const stopSpy = vi.spyOn(app.runtime, 'stop').mockResolvedValue(undefined);
    await app.start({ port: 9123 });
    expect(startSpy).toHaveBeenCalledTimes(1);
    expect(app.runtime.config.port).toBe(9123);
    await app.stop();
    expect(stopSpy).toHaveBeenCalledTimes(1);
  });

  it('registerWith POSTs a SubAgentDescriptor to the parent /registry/subagents', async () => {
    const app = await defineSubAgent({
      name: 'travel-specialist',
      description: 'Travel booking specialist',
      whenToUse: 'when booking travel',
    });
    let receivedUrl = '';
    let receivedBody: unknown = null;
    let receivedAuth: string | undefined;
    const fakeFetch = vi.fn(async (url: string, init?: RequestInit) => {
      receivedUrl = url;
      receivedBody = JSON.parse(String(init?.body ?? '{}'));
      receivedAuth = (init?.headers as Record<string, string> | undefined)?.['authorization'];
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const originalFetch = globalThis.fetch;
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = fakeFetch as unknown as typeof globalThis.fetch;
    try {
      await app.registerWith({
        parentUrl: 'http://parent:8080/',
        endpoint: 'http://localhost:8081/federate',
        parentAuthToken: 'tok-42',
      });
      expect(receivedUrl).toBe('http://parent:8080/registry/subagents');
      expect(receivedAuth).toBe('Bearer tok-42');
      expect(receivedBody).toMatchObject({
        name: 'travel-specialist',
        transport: 'http',
        endpoint: 'http://localhost:8081/federate',
        description: 'Travel booking specialist',
      });
    } finally {
      (globalThis as { fetch: typeof globalThis.fetch }).fetch = originalFetch;
    }
  });

  it('registerWith throws on non-2xx parent response', async () => {
    const app = await defineSubAgent({ name: 'whatever' });
    const originalFetch = globalThis.fetch;
    (globalThis as { fetch: typeof globalThis.fetch }).fetch = (async () =>
      new Response('parent rejected', { status: 503 })) as unknown as typeof globalThis.fetch;
    try {
      await expect(
        app.registerWith({
          parentUrl: 'http://parent:8080',
          endpoint: 'http://localhost:8081/federate',
        }),
      ).rejects.toThrow(/HTTP 503/);
    } finally {
      (globalThis as { fetch: typeof globalThis.fetch }).fetch = originalFetch;
    }
  });
});
