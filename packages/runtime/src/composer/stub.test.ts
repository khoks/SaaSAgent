import { describe, it, expect } from 'vitest';
import { StubComposer } from './stub.js';

describe('StubComposer', () => {
  const ctx = {
    components: { version: '1', components: {} },
    theme: { name: 't', version: '1', tokens: {} },
    conversationContext: { intent: 'help me find a TV' },
  };

  it('returns a ComposedLayout with a unique compose cycle id', async () => {
    const composer = new StubComposer();
    const a = await composer.compose('intent A', ctx);
    const b = await composer.compose('intent B', ctx);
    expect(a.composeCycleId).not.toBe(b.composeCycleId);
    expect(a.composeCycleId).toMatch(/^stub-/);
  });

  it('echoes the intent into the root Card title', async () => {
    const composer = new StubComposer();
    const layout = await composer.compose('find a 55-inch TV', ctx);
    expect(layout.root.component).toBe('Card');
    expect(layout.root.props?.['title']).toContain('find a 55-inch TV');
  });

  it('wires a click emit on the acknowledge button with the intent in payload', async () => {
    const composer = new StubComposer();
    const layout = await composer.compose('intent X', ctx);
    const button = layout.root.children?.find((c) => c.id === 'btn-ack');
    expect(button).toBeDefined();
    expect(button?.emits?.['click']?.type).toBe('acknowledge');
    expect((button?.emits?.['click']?.payload as { intent: string }).intent).toBe('intent X');
  });

  it('includes metadata for caching + analytics', async () => {
    const composer = new StubComposer();
    const layout = await composer.compose('intent X', ctx);
    expect(layout.metadata?.intent).toBe('intent X');
    expect(layout.metadata?.modelUsed?.composer).toBe('stub');
    expect(layout.metadata?.fromCache).toBe(false);
  });
});
