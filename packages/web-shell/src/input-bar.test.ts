// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';
import { InputBar } from './input-bar.js';

class CapturingTransport implements EmitTransport {
  envelopes: InstructionEnvelope[] = [];
  send(envelope: InstructionEnvelope): void { this.envelopes.push(envelope); }
}

function makeBar(opts: { cycleId?: string | null } = {}) {
  const transport = new CapturingTransport();
  let seq = 0;
  // Use 'cycleId' in opts to distinguish "explicitly null" from "not specified" —
  // ?? would coalesce both to the default and defeat the null-fallback test below.
  const cycleIdGetter = (): string | null =>
    'cycleId' in opts ? (opts.cycleId ?? null) : 'cycle-test';
  const bar = new InputBar({
    transport,
    getComposeCycleId: cycleIdGetter,
    getSequence: () => seq++,
  });
  document.body.appendChild(bar.element);
  return { bar, transport };
}

describe('InputBar', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('renders a textarea + send button', () => {
    const { bar } = makeBar();
    expect(bar.element.querySelector('[data-saas-agent-input]')).toBeTruthy();
    expect(bar.element.querySelector('[data-saas-agent-input-send]')).toBeTruthy();
  });

  it('emits a user-message InstructionEnvelope on send-button click', () => {
    const { bar, transport } = makeBar({ cycleId: 'cycle-abc' });
    const ta = bar.element.querySelector('textarea')!;
    ta.value = 'find me a 55-inch TV';
    bar.element.querySelector<HTMLButtonElement>('button')!.click();

    expect(transport.envelopes).toHaveLength(1);
    const env = transport.envelopes[0]!;
    expect(env.type).toBe('user-message');
    expect(env.composeCycleId).toBe('cycle-abc');
    expect(env.sourceNodeId).toBe('user-input');
    expect(env.payload).toEqual({ text: 'find me a 55-inch TV' });
    expect(env.sequence).toBe(0);
  });

  it('submits on Enter, inserts newline on Shift+Enter', () => {
    const { bar, transport } = makeBar();
    const ta = bar.element.querySelector('textarea')!;
    ta.value = 'hello';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(transport.envelopes).toHaveLength(1);

    ta.value = 'multi';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }));
    // Shift+Enter does NOT submit (no preventDefault → browser inserts newline)
    expect(transport.envelopes).toHaveLength(1);
  });

  it('clears the textarea after a successful submit', () => {
    const { bar } = makeBar();
    const ta = bar.element.querySelector('textarea')!;
    ta.value = 'something';
    bar.element.querySelector<HTMLButtonElement>('button')!.click();
    expect(ta.value).toBe('');
  });

  it('does not emit for empty / whitespace-only input', () => {
    const { bar, transport } = makeBar();
    const ta = bar.element.querySelector('textarea')!;
    ta.value = '   \n  ';
    bar.element.querySelector<HTMLButtonElement>('button')!.click();
    expect(transport.envelopes).toHaveLength(0);
  });

  it('increments sequence across submits', () => {
    const { bar, transport } = makeBar();
    const ta = bar.element.querySelector('textarea')!;
    for (const t of ['one', 'two', 'three']) {
      ta.value = t;
      bar.element.querySelector<HTMLButtonElement>('button')!.click();
    }
    expect(transport.envelopes.map((e) => e.sequence)).toEqual([0, 1, 2]);
  });

  it('falls back to "no-cycle" composeCycleId when getter returns null', () => {
    const { bar, transport } = makeBar({ cycleId: null });
    const ta = bar.element.querySelector('textarea')!;
    ta.value = 'hi';
    bar.element.querySelector<HTMLButtonElement>('button')!.click();
    expect(transport.envelopes[0]?.composeCycleId).toBe('no-cycle');
  });

  it('setBusy disables input + button and changes send-button cursor', () => {
    const { bar, transport } = makeBar();
    bar.setBusy(true);
    const ta = bar.element.querySelector<HTMLTextAreaElement>('textarea')!;
    const btn = bar.element.querySelector<HTMLButtonElement>('button')!;
    expect(ta.disabled).toBe(true);
    expect(btn.disabled).toBe(true);
    expect(btn.style.cursor).toBe('wait');

    ta.value = 'ignored';
    btn.click(); // disabled buttons don't fire click; also submit() guards on busy
    expect(transport.envelopes).toHaveLength(0);

    bar.setBusy(false);
    expect(ta.disabled).toBe(false);
    expect(btn.disabled).toBe(false);
  });
});
