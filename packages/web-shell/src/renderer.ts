/**
 * LayoutRenderer — walks a typed-JSON {@link ComposedLayout} and renders it into the DOM.
 *
 * Status: Phase 1.1 skeleton. The renderer currently emits a placeholder DOM tree
 * (`<div data-component="Card" data-id="root">…</div>`) that mirrors the LayoutTree
 * 1:1 so the protocol loop can be validated end-to-end without dragging the actual
 * host atomic-component mounting into Phase 1.1.
 *
 * Real mounting (host React / Web Components) lands in Phase 1.4 alongside the
 * Atomic UI Components registry implementation.
 *
 * Per ADR-005: every interactive node subscribes to its declared emits and dispatches
 * an {@link InstructionEnvelope} via the supplied {@link EmitTransport}.
 */

import type {
  ComposedLayout,
  EmitSpec,
  EmitTransport,
  InstructionEnvelope,
  LayoutNode,
} from '@saasagent/protocol';

export interface RenderOptions {
  /** Shadow root or HTMLElement to render into. */
  container: HTMLElement | ShadowRoot;
  /** Where InstructionEnvelopes get sent. */
  transport: EmitTransport;
}

export class LayoutRenderer {
  private sequence = 0;

  constructor(private readonly options: RenderOptions) {}

  render(layout: ComposedLayout): void {
    const { container } = this.options;
    container.innerHTML = '';
    container.appendChild(this.renderNode(layout, layout.root));
  }

  private renderNode(layout: ComposedLayout, node: LayoutNode): HTMLElement {
    const el = document.createElement('div');
    el.setAttribute('data-component', node.component);
    el.setAttribute('data-id', node.id);
    if (node.props) {
      el.setAttribute('data-props', JSON.stringify(node.props));
    }

    const title = (node.props?.['title'] ?? node.props?.['label'] ?? node.props?.['content']) as
      | string
      | undefined;
    if (title) {
      const text = document.createElement('span');
      text.className = 'saas-agent-text';
      text.textContent = title;
      el.appendChild(text);
    }

    if (node.children) {
      for (const child of node.children) {
        el.appendChild(this.renderNode(layout, child));
      }
    }

    if (node.emits) {
      for (const [domEvent, emitSpec] of Object.entries(node.emits)) {
        el.addEventListener(domEvent, () => {
          this.dispatchEmit(layout.composeCycleId, node.id, emitSpec);
        });
      }
    }

    return el;
  }

  private dispatchEmit(composeCycleId: string, sourceNodeId: string, emitSpec: EmitSpec): void {
    const envelope: InstructionEnvelope = {
      composeCycleId,
      sourceNodeId,
      emittedAt: new Date().toISOString(),
      type: emitSpec.type,
      sequence: this.sequence++,
      payload: emitSpec.payload,
    };
    void this.options.transport.send(envelope);
  }
}
