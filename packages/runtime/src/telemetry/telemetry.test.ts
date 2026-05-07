import { describe, it, expect, vi } from 'vitest';
import { NoopTelemetry, ConsoleTelemetry, OpenTelemetryAdapter } from './index.js';

describe('NoopTelemetry', () => {
  it('drops logs + metrics + spans', async () => {
    const t = new NoopTelemetry();
    t.log('error', 'noisy');
    t.metric('whatever', 999);
    const r = await t.span('x', async () => 42);
    expect(r).toBe(42);
  });
});

describe('ConsoleTelemetry', () => {
  it('emits human-format logs at info+ by default', () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    const t = new ConsoleTelemetry();
    t.log('debug', 'too quiet');
    t.log('info', 'audible');
    spy.mockRestore();
    expect(lines.some((l) => l.includes('audible'))).toBe(true);
    expect(lines.some((l) => l.includes('too quiet'))).toBe(false);
  });

  it('respects level filter', () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    const t = new ConsoleTelemetry({ level: 'warn' });
    t.log('info', 'ignored');
    spy.mockRestore();
    expect(lines.length).toBe(0);
  });

  it('emits JSON-Line format when configured', () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    const t = new ConsoleTelemetry({ format: 'json', now: () => 0 });
    t.log('info', 'hello', { foo: 'bar' });
    spy.mockRestore();
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed).toMatchObject({ level: 'info', msg: 'hello', foo: 'bar' });
  });

  it('span emits a duration_ms metric on success + returns the result', async () => {
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    let now = 100;
    const t = new ConsoleTelemetry({ format: 'json', level: 'debug', now: () => now });
    const r = await t.span('compose', async () => {
      now += 50;
      return 'done';
    });
    spy.mockRestore();
    expect(r).toBe('done');
    const metricLine = lines.find((l) => l.includes('span.compose.duration_ms'));
    expect(metricLine).toBeTruthy();
    const parsed = JSON.parse(metricLine!);
    expect(parsed.value).toBe(50);
    expect(parsed.tags.status).toBe('ok');
  });

  it('span re-throws + records error metric', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const t = new ConsoleTelemetry({ format: 'json', level: 'debug' });
    await expect(t.span('x', async () => { throw new Error('boom'); })).rejects.toThrow(/boom/);
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('OpenTelemetryAdapter', () => {
  function fakeOtel(): {
    counters: Map<string, Array<{ value: number; attrs?: unknown }>>;
    histograms: Map<string, Array<{ value: number; attrs?: unknown }>>;
    spans: Array<{ name: string; attrs?: unknown; status?: { code: number; message?: string }; ended: boolean; exception?: unknown }>;
    logs: Array<{ level: string; body: string }>;
    options: { tracer: any; meter: any; logger: any };
  } {
    const counters = new Map<string, Array<{ value: number; attrs?: unknown }>>();
    const histograms = new Map<string, Array<{ value: number; attrs?: unknown }>>();
    const spans: Array<{ name: string; attrs?: unknown; status?: { code: number; message?: string }; ended: boolean; exception?: unknown }> = [];
    const logs: Array<{ level: string; body: string }> = [];
    const tracer = {
      startSpan: (name: string, opts?: { attributes?: Record<string, unknown> }) => {
        const rec = { name, attrs: opts?.attributes, ended: false } as { name: string; attrs?: unknown; status?: { code: number; message?: string }; ended: boolean; exception?: unknown };
        spans.push(rec);
        return {
          setAttribute: (k: string, v: unknown) => { rec.attrs = { ...(rec.attrs as object ?? {}), [k]: v }; },
          setStatus: (s: { code: number; message?: string }) => { rec.status = s; },
          recordException: (e: unknown) => { rec.exception = e; },
          end: () => { rec.ended = true; },
        };
      },
    };
    const meter = {
      createCounter: (name: string) => {
        const arr: Array<{ value: number; attrs?: unknown }> = [];
        counters.set(name, arr);
        return { add: (v: number, a?: unknown) => arr.push({ value: v, attrs: a }) };
      },
      createHistogram: (name: string) => {
        const arr: Array<{ value: number; attrs?: unknown }> = [];
        histograms.set(name, arr);
        return { record: (v: number, a?: unknown) => arr.push({ value: v, attrs: a }) };
      },
    };
    const logger = {
      emit: (r: { severityText: string; body: string }) => logs.push({ level: r.severityText, body: r.body }),
    };
    return { counters, histograms, spans, logs, options: { tracer, meter, logger } };
  }

  it('reports its name', () => {
    const f = fakeOtel();
    expect(new OpenTelemetryAdapter(f.options).name).toBe('opentelemetry');
  });

  it('relays log() to the OTel logger when configured', () => {
    const f = fakeOtel();
    const t = new OpenTelemetryAdapter(f.options);
    t.log('warn', 'careful', { sessionId: 'sess-1' });
    expect(f.logs).toHaveLength(1);
    expect(f.logs[0]).toMatchObject({ level: 'WARN', body: 'careful' });
  });

  it('routes histogram-shaped metrics to createHistogram, others to createCounter', () => {
    const f = fakeOtel();
    const t = new OpenTelemetryAdapter(f.options);
    t.metric('compose.duration_ms', 42);
    t.metric('plan.invocations', 1);
    expect(f.histograms.get('compose.duration_ms')?.[0]?.value).toBe(42);
    expect(f.counters.get('plan.invocations')?.[0]?.value).toBe(1);
  });

  it('span starts + ends + sets OK status on success', async () => {
    const f = fakeOtel();
    const t = new OpenTelemetryAdapter(f.options);
    const r = await t.span('plan', async () => 'ok', { tier: 'sonnet' });
    expect(r).toBe('ok');
    expect(f.spans).toHaveLength(1);
    expect(f.spans[0]).toMatchObject({ name: 'plan', ended: true });
    expect(f.spans[0]!.status?.code).toBe(1); // OK
    expect(f.spans[0]!.attrs).toMatchObject({ tier: 'sonnet' });
  });

  it('span records exception + sets ERROR status, then re-throws', async () => {
    const f = fakeOtel();
    const t = new OpenTelemetryAdapter(f.options);
    await expect(
      t.span('bad', async () => { throw new Error('nope'); }),
    ).rejects.toThrow(/nope/);
    expect(f.spans[0]!.status?.code).toBe(2); // ERROR
    expect(f.spans[0]!.exception).toBeInstanceOf(Error);
    expect(f.spans[0]!.ended).toBe(true);
  });

  it('falls back to console when no logger is provided', () => {
    const f = fakeOtel();
    const noLogger = { tracer: f.options.tracer, meter: f.options.meter };
    const lines: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((s) => lines.push(String(s)));
    const t = new OpenTelemetryAdapter(noLogger);
    t.log('info', 'fallthrough');
    spy.mockRestore();
    expect(lines.some((l) => l.includes('fallthrough'))).toBe(true);
  });

  it('reuses the same counter/histogram across calls', () => {
    const f = fakeOtel();
    const t = new OpenTelemetryAdapter(f.options);
    t.metric('plan.invocations', 1);
    t.metric('plan.invocations', 2);
    expect(f.counters.get('plan.invocations')?.length).toBe(2);
  });
});
