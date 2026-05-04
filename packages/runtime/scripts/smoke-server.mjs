// Standalone smoke: start RuntimeServer with HaikuComposer, open an EventSource
// client (the same one our integration tests use), wait for the welcome layout.
// Reproduces the conditions of the PowerShell smoke without using PowerShell's
// HttpWebRequest, to isolate whether the hang is in the runtime or in my smoke harness.
import { EventSource } from 'eventsource';
import { RuntimeServer } from './dist/transport/index.js';
import { HaikuComposer } from './dist/composer/index.js';
import { AnthropicProvider } from './dist/model/index.js';

const server = new RuntimeServer({
  port: 0,
  composer: new HaikuComposer({ provider: new AnthropicProvider() }),
  onSSEConnect: () => console.log('[server] SSE client connected'),
});
await server.start();
console.log(`[server] listening on ${server.port}`);

const t0 = Date.now();
const sse = new EventSource(`http://127.0.0.1:${server.port}/sse`);
const layout = await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('TIMEOUT after 30s waiting for layout event')), 30000);
  sse.addEventListener('layout', (e) => {
    clearTimeout(t);
    sse.close();
    resolve(JSON.parse(e.data));
  });
  sse.addEventListener('composer-error', (e) => {
    clearTimeout(t);
    sse.close();
    reject(new Error(`composer-error: ${e.data}`));
  });
  sse.onerror = (e) => {
    clearTimeout(t);
    sse.close();
    reject(new Error(`SSE error: ${JSON.stringify(e)}`));
  };
}).catch((e) => ({ __error: e.message }));

const dt = Date.now() - t0;
if (layout && !layout.__error) {
  console.log(`[client] received layout in ${dt} ms`);
  console.log(`composeCycleId: ${layout.composeCycleId}`);
  console.log(`root.component: ${layout.root.component}`);
  console.log(`children: ${layout.root.children?.length ?? 0}`);
} else {
  console.error(`[client] failed in ${dt} ms: ${layout.__error}`);
}

await server.stop();
console.log('[server] stopped');
