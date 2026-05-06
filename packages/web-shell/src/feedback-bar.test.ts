// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackBar } from './feedback-bar.js';
import type { EmitTransport, InstructionEnvelope } from '@saasagent/protocol';

let sent: InstructionEnvelope[] = [];
const transport: EmitTransport = { send: (env) => void sent.push(env) };

beforeEach(() => {
  sent = [];
});

function make(opts: { cycleId?: string | null } = {}): FeedbackBar {
  let seq = 0;
  return new FeedbackBar({
    transport,
    getComposeCycleId: () => ('cycleId' in opts ? (opts.cycleId ?? null) : 'cycle-test'),
    getSequence: () => seq++,
  });
}

describe('FeedbackBar', () => {
  it('renders thumbs-up + thumbs-down buttons + status element', () => {
    const bar = make();
    document.body.appendChild(bar.element);
    expect(bar.element.querySelectorAll('button').length).toBe(2);
    expect(bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]')).toBeTruthy();
    expect(bar.element.querySelector('[data-saas-agent-feedback="thumbs-down"]')).toBeTruthy();
    expect(bar.element.querySelector('[data-saas-agent-feedback-status]')).toBeTruthy();
  });

  it('emits a positive eval-feedback envelope when thumbs-up is clicked', () => {
    const bar = make();
    document.body.appendChild(bar.element);
    (bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement).click();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      type: 'eval-feedback',
      sourceNodeId: 'feedback-bar',
      composeCycleId: 'cycle-test',
      payload: { signal: 'positive', source: 'user-explicit' },
    });
  });

  it('emits a negative eval-feedback envelope when thumbs-down is clicked', () => {
    const bar = make();
    document.body.appendChild(bar.element);
    (bar.element.querySelector('[data-saas-agent-feedback="thumbs-down"]') as HTMLButtonElement).click();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.payload).toMatchObject({ signal: 'negative', source: 'user-explicit' });
  });

  it('refuses to emit when no compose-cycle-id is available', () => {
    const bar = make({ cycleId: null });
    document.body.appendChild(bar.element);
    (bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement).click();
    expect(sent).toHaveLength(0);
  });

  it('refuses double-submission for the same composeCycleId', () => {
    const bar = make();
    const up = bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement;
    const down = bar.element.querySelector('[data-saas-agent-feedback="thumbs-down"]') as HTMLButtonElement;
    up.click();
    down.click();
    up.click();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.payload).toMatchObject({ signal: 'positive' });
  });

  it('disables both buttons after first submission and shows status text', () => {
    const bar = make();
    const up = bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement;
    const down = bar.element.querySelector('[data-saas-agent-feedback="thumbs-down"]') as HTMLButtonElement;
    const status = bar.element.querySelector('[data-saas-agent-feedback-status]') as HTMLSpanElement;
    up.click();
    expect(up.disabled).toBe(true);
    expect(down.disabled).toBe(true);
    expect(status.textContent).toMatch(/thanks/i);
  });

  it('resetForNewCycle re-enables buttons + clears status', () => {
    let cycleId = 'cycle-1';
    let seq = 0;
    const bar = new FeedbackBar({
      transport,
      getComposeCycleId: () => cycleId,
      getSequence: () => seq++,
    });
    const up = bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement;
    up.click();
    expect(up.disabled).toBe(true);
    cycleId = 'cycle-2';
    bar.resetForNewCycle('cycle-2');
    expect(up.disabled).toBe(false);
    const status = bar.element.querySelector('[data-saas-agent-feedback-status]') as HTMLSpanElement;
    expect(status.textContent).toBe('');
    up.click();
    expect(sent).toHaveLength(2);
    expect(sent[1]!.composeCycleId).toBe('cycle-2');
  });

  it('sequence increments per emit', () => {
    let seq = 100;
    const bar = new FeedbackBar({
      transport,
      getComposeCycleId: () => 'cycle-test',
      getSequence: () => seq++,
    });
    (bar.element.querySelector('[data-saas-agent-feedback="thumbs-up"]') as HTMLButtonElement).click();
    expect(sent[0]!.sequence).toBe(100);
    bar.resetForNewCycle('different');
    // Now next click on same widget (with simulated new cycleId via reset) would emit with 101.
    // The bar refuses to re-emit for the same cycleId, so simulate by mutating the getter.
    expect(seq).toBe(101);
  });
});
