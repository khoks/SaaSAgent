// Standalone smoke: invoke HaikuComposer directly (no HTTP server / SSE / WS).
// If this works fast, the hang is in our server wrapping.
// If this hangs, the issue is in HaikuComposer / AnthropicProvider / parse / cache.
import { HaikuComposer } from './dist/composer/index.js';
import { AnthropicProvider } from './dist/model/index.js';

const composer = new HaikuComposer({ provider: new AnthropicProvider() });

console.log('Calling composer.compose("welcome", ...)');
const t0 = Date.now();
try {
  const layout = await composer.compose('welcome', {
    components: { version: '0', components: {} },
    theme: { name: 'd', version: '0', tokens: {} },
    conversationContext: { intent: 'welcome' },
  });
  const dt = Date.now() - t0;
  console.log(`Composed in ${dt} ms`);
  console.log(`composeCycleId: ${layout.composeCycleId}`);
  console.log(`root.component: ${layout.root.component}`);
  console.log(`children: ${layout.root.children?.length ?? 0}`);
  console.log(`metadata.modelUsed: ${JSON.stringify(layout.metadata?.modelUsed)}`);
  console.log(`metadata.fromCache: ${layout.metadata?.fromCache}`);
} catch (err) {
  console.error(`FAILED in ${Date.now() - t0} ms:`, err.message);
  if (err.source) console.error('source:', err.source);
}
