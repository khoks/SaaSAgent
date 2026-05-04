import { describe, it, expect } from 'vitest';
import {
  PROTOCOL_VERSION,
  type LayoutNode,
  type ComposedLayout,
  type InstructionEnvelope,
  type AtomicComponent,
  type ThemeRegistration,
  type UIComposer,
  type ComposeContext,
} from './index.js';

describe('@saasagent/protocol', () => {
  it('exports a versioned protocol identifier', () => {
    expect(PROTOCOL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('LayoutNode is constructable with minimal fields', () => {
    const node: LayoutNode = { id: 'root', component: 'Card' };
    expect(node.id).toBe('root');
    expect(node.component).toBe('Card');
  });

  it('ComposedLayout carries causality + tree', () => {
    const layout: ComposedLayout = {
      composeCycleId: 'cycle-1',
      composedAt: '2026-05-08T00:00:00Z',
      root: {
        id: 'root',
        component: 'Card',
        children: [{ id: 'child-1', component: 'Text', props: { content: 'hi' } }],
      },
    };
    expect(layout.composeCycleId).toBe('cycle-1');
    expect(layout.root.children).toHaveLength(1);
  });

  it('InstructionEnvelope ties back to its compose cycle', () => {
    const env: InstructionEnvelope = {
      composeCycleId: 'cycle-1',
      sourceNodeId: 'btn-buy',
      emittedAt: '2026-05-08T00:00:01Z',
      type: 'add-to-cart',
      sequence: 0,
      payload: { productId: 'tv-sony-55' },
    };
    expect(env.composeCycleId).toBe('cycle-1');
    expect(env.type).toBe('add-to-cart');
  });

  it('AtomicComponent registration captures semantic role + props schema', () => {
    const c: AtomicComponent = {
      name: 'ProductTile',
      version: '1.0.0',
      framework: 'react',
      semanticRole: 'card-style summary of a single product with price + image + rating',
      whenToUse: 'Use for any product surface where the user might click into details.',
      propsSchema: {
        type: 'object',
        properties: {
          productId: { type: 'string' },
          title: { type: 'string' },
          price: { type: 'number' },
        },
        required: ['productId', 'title'],
      },
      moduleSpecifier: '@walmart-ds/components',
      exportName: 'ProductTile',
    };
    expect(c.framework).toBe('react');
    expect(c.semanticRole).toContain('product');
  });

  it('ThemeRegistration accepts DTCG token groups', () => {
    const theme: ThemeRegistration = {
      name: 'walmart-default',
      version: '1.0.0',
      tokens: {
        color: {
          brand: {
            primary: { $value: '#0071dc', $type: 'color' },
          },
        },
      },
    };
    expect(theme.name).toBe('walmart-default');
    const brand = theme.tokens.color as Record<string, unknown>;
    expect(brand).toBeDefined();
  });

  it('UIComposer interface is implementable as a fake', async () => {
    const fake: UIComposer = {
      async compose(intent: string, _context: ComposeContext): Promise<ComposedLayout> {
        return {
          composeCycleId: 'fake-1',
          composedAt: new Date().toISOString(),
          root: { id: 'root', component: 'Card', props: { title: intent } },
        };
      },
    };
    const layout = await fake.compose('hello', {
      components: { version: '1', components: {} },
      theme: { name: 't', version: '1', tokens: {} },
      conversationContext: { intent: 'hello' },
    });
    expect(layout.root.props?.['title']).toBe('hello');
  });
});
