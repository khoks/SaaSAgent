// Standalone smoke: invoke the SDK directly with the same system-block + cache_control
// shape AnthropicProvider sends, plus the actual composer system prompt. If THIS hangs,
// the issue is in the SDK call. If this works fast, the issue is in our wrapping.
import Anthropic from '@anthropic-ai/sdk';
import { buildComposerSystemPrompt } from './dist/composer/prompt.js';

const client = new Anthropic();
const system = buildComposerSystemPrompt().map((b) => ({
  type: 'text',
  text: b.text,
  ...(b.cache ? { cache_control: { type: 'ephemeral' } } : {}),
}));

console.log(`Sending request: ${system.length} system blocks, ~${system[0].text.length} chars`);
const t0 = Date.now();
const resp = await client.messages.create({
  model: 'claude-haiku-4-5',
  max_tokens: 2048,
  system,
  messages: [{ role: 'user', content: 'User intent: welcome\n\nEmit a single JSON layout-tree object now.' }],
});
const dt = Date.now() - t0;
console.log(`Response in ${dt} ms, stop_reason=${resp.stop_reason}, model=${resp.model}`);
console.log(`Usage: in=${resp.usage.input_tokens} out=${resp.usage.output_tokens} cache_read=${resp.usage.cache_read_input_tokens ?? 0} cache_create=${resp.usage.cache_creation_input_tokens ?? 0}`);
console.log('--- text ---');
for (const block of resp.content) {
  if (block.type === 'text') console.log(block.text);
}
