import type {
  ComposeContext,
  ComposedLayout,
  LayoutNode,
  UIComposer,
} from '@saasagent/protocol';

/**
 * StubComposer — deterministic, hand-crafted layouts for Phase 1 protocol-loop validation.
 *
 * Returns a fixed Card-with-Text-and-Button layout for any intent. Replaced by HaikuComposer +
 * cached templates (Phase 1.3) once the protocol loop is end-to-end working.
 */
export class StubComposer implements UIComposer {
  async compose(intent: string, _context: ComposeContext): Promise<ComposedLayout> {
    const composeCycleId = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const root: LayoutNode = {
      id: 'root',
      component: 'Card',
      props: { title: `You asked: ${intent}` },
      children: [
        {
          id: 'msg',
          component: 'Text',
          props: {
            content: `Stub composer responding at ${new Date().toISOString()}. Real Composer lands in Phase 1.3.`,
          },
        },
        {
          id: 'btn-ack',
          component: 'Button',
          props: { label: 'Got it' },
          emits: {
            click: { type: 'acknowledge', payload: { intent } },
          },
        },
      ],
    };
    return {
      composeCycleId,
      composedAt: new Date().toISOString(),
      root,
      metadata: {
        intent,
        sources: ['stub-composer'],
        modelUsed: { composer: 'stub' },
        fromCache: false,
      },
    };
  }
}
