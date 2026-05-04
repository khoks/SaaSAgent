// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { ComposedLayout, InstructionEnvelope } from '@saasagent/protocol';
import { LayoutRenderer, type EmitTransport } from './renderer.js';

class CapturingTransport implements EmitTransport {
  envelopes: InstructionEnvelope[] = [];
  send(envelope: InstructionEnvelope): void {
    this.envelopes.push(envelope);
  }
}

const sampleLayout: ComposedLayout = {
  composeCycleId: 'cycle-test',
  composedAt: '2026-05-08T00:00:00Z',
  root: {
    id: 'root',
    component: 'Card',
    props: { title: 'Hello' },
    children: [
      { id: 'msg', component: 'Text', props: { content: 'world' } },
      {
        id: 'btn',
        component: 'Button',
        props: { label: 'Click me' },
        emits: {
          click: { type: 'click-fired', payload: { from: 'test' } },
        },
      },
    ],
  },
};

describe('LayoutRenderer', () => {
  let container: HTMLElement;
  let transport: CapturingTransport;
  let renderer: LayoutRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    transport = new CapturingTransport();
    renderer = new LayoutRenderer({ container, transport });
  });

  it('walks the layout tree and renders a node per LayoutNode', () => {
    renderer.render(sampleLayout);
    expect(container.querySelectorAll('[data-component]')).toHaveLength(3);
    expect(container.querySelector('[data-component="Card"][data-id="root"]')).toBeTruthy();
    expect(container.querySelector('[data-component="Text"][data-id="msg"]')).toBeTruthy();
    expect(container.querySelector('[data-component="Button"][data-id="btn"]')).toBeTruthy();
  });

  it('renders title/label/content props as visible text', () => {
    renderer.render(sampleLayout);
    expect(container.textContent).toContain('Hello');
    expect(container.textContent).toContain('world');
    expect(container.textContent).toContain('Click me');
  });

  it('emits a typed InstructionEnvelope on configured DOM events', () => {
    renderer.render(sampleLayout);
    const button = container.querySelector('[data-component="Button"]') as HTMLElement;
    button.click();

    expect(transport.envelopes).toHaveLength(1);
    const env = transport.envelopes[0]!;
    expect(env.composeCycleId).toBe('cycle-test');
    expect(env.sourceNodeId).toBe('btn');
    expect(env.type).toBe('click-fired');
    expect(env.payload).toEqual({ from: 'test' });
    expect(env.sequence).toBe(0);
  });

  it('increments sequence on successive emits', () => {
    renderer.render(sampleLayout);
    const button = container.querySelector('[data-component="Button"]') as HTMLElement;
    button.click();
    button.click();
    button.click();
    expect(transport.envelopes.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('overwrites the container on re-render (no DOM accretion)', () => {
    renderer.render(sampleLayout);
    renderer.render(sampleLayout);
    expect(container.querySelectorAll('[data-component]')).toHaveLength(3);
  });
});
