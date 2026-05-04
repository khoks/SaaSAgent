import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { EventSource } from 'eventsource';
import type { ComposedLayout, InstructionEnvelope } from '@saasagent/protocol';

import { StubComposer } from '../composer/stub.js';
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
