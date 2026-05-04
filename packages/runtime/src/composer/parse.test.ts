import { describe, it, expect } from 'vitest';
import { parseLayoutNode } from './parse.js';

describe('parseLayoutNode', () => {
  it('parses a clean valid JSON layout', () => {
    const text = JSON.stringify({
      id: 'root',
      component: 'Card',
      props: { title: 'hi' },
      children: [{ id: 'msg', component: 'Text', props: { content: 'hello' } }],
    });
    const r = parseLayoutNode(text);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.node.component).toBe('Card');
      expect(r.node.children).toHaveLength(1);
    }
  });

  it('strips a ```json ... ``` code fence', () => {
    const text = '```json\n{"id":"root","component":"Card"}\n```';
    const r = parseLayoutNode(text);
    expect(r.ok).toBe(true);
  });

  it('extracts the first balanced JSON object out of trailing text', () => {
    const text = '{"id":"root","component":"Card"}\nNote: composer added explanation';
    const r = parseLayoutNode(text);
    expect(r.ok).toBe(true);
  });

  it('returns ok=false on missing JSON', () => {
    const r = parseLayoutNode('Sorry, I cannot help.');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/No JSON/);
  });

  it('returns ok=false on malformed JSON', () => {
    const r = parseLayoutNode('{ not actual json ');
    expect(r.ok).toBe(false);
  });

  it('returns ok=false on schema mismatch (missing component)', () => {
    const r = parseLayoutNode('{"id":"root"}');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/component/);
  });

  it('validates emit declarations with payload', () => {
    const text = JSON.stringify({
      id: 'root',
      component: 'Card',
      children: [
        {
          id: 'btn',
          component: 'Button',
          props: { label: 'Buy' },
          emits: { click: { type: 'buy', payload: { sku: 'tv-55' } } },
        },
      ],
    });
    const r = parseLayoutNode(text);
    expect(r.ok).toBe(true);
  });
});
