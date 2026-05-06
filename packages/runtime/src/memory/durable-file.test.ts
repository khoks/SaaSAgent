import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DurableFileMemoryProvider } from './durable-file.js';

const turn = (speaker: 'user' | 'agent', text: string, at = '2026-01-01T00:00:00Z') => ({
  speaker,
  text,
  at,
});

let testFile: string;

beforeEach(async () => {
  testFile = join(
    tmpdir(),
    `saasagent-memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
  );
});

afterEach(async () => {
  try {
    await fs.unlink(testFile);
  } catch {
    // ignore — cleanup
  }
});

describe('DurableFileMemoryProvider', () => {
  it('reports its name', () => {
    expect(new DurableFileMemoryProvider({ filePath: testFile }).name).toBe('durable-file');
  });

  it('returns empty recall when the file does not exist (first-run)', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r).toEqual([]);
  });

  it('record() flushes synchronously by default (flushStrategy=each)', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    await m.record(turn('user', 'hello'), 's1');
    const onDisk = JSON.parse(await fs.readFile(testFile, 'utf-8'));
    expect(onDisk.version).toBe(1);
    expect(onDisk.sessions['s1']).toHaveLength(1);
    expect(onDisk.sessions['s1'][0].text).toBe('hello');
  });

  it('survives instance recreation — second provider reads from the first run', async () => {
    const m1 = new DurableFileMemoryProvider({ filePath: testFile });
    await m1.record(turn('user', 'hi'), 's1');
    await m1.record(turn('agent', 'hello back'), 's1');

    const m2 = new DurableFileMemoryProvider({ filePath: testFile });
    const r = await m2.recall({ text: '', sessionId: 's1' });
    expect(r).toHaveLength(2);
    expect(r[0]!.summary).toContain('hi');
    expect(r[1]!.summary).toContain('hello back');
  });

  it('uses atomic temp+rename writes (no torn-write window)', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    await m.record(turn('user', 'one'), 's1');
    const tmpName = `${testFile}.tmp`;
    // After flush completes, temp file should be gone (renamed).
    await expect(fs.access(tmpName)).rejects.toThrow();
    await expect(fs.access(testFile)).resolves.toBeUndefined();
  });

  it('does NOT flush on record() when flushStrategy=manual; flush() persists', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile, flushStrategy: 'manual' });
    await m.record(turn('user', 'cached'), 's1');
    // Disk should still be empty.
    await expect(fs.access(testFile)).rejects.toThrow();
    await m.flush();
    const onDisk = JSON.parse(await fs.readFile(testFile, 'utf-8'));
    expect(onDisk.sessions['s1'][0].text).toBe('cached');
  });

  it('respects maxPerSession FIFO eviction', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile, maxPerSession: 3 });
    for (let i = 0; i < 7; i++) {
      await m.record(turn('user', `t${i}`), 's1');
    }
    expect(m.getSession('s1')).toHaveLength(3);
    expect(m.getSession('s1')[0]!.text).toBe('t4');
    expect(m.getSession('s1')[2]!.text).toBe('t6');
  });

  it('clearSession drops one bucket and persists the change', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    await m.record(turn('user', 'a'), 's1');
    await m.record(turn('user', 'b'), 's2');
    expect(m.clearSession('s1')).toBe(true);
    // Wait briefly for async write
    await new Promise((r) => setTimeout(r, 50));
    const onDisk = JSON.parse(await fs.readFile(testFile, 'utf-8'));
    expect(Object.keys(onDisk.sessions)).toEqual(['s2']);
  });

  it('listSessions returns the current set', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    await m.record(turn('user', 'a'), 'alpha');
    await m.record(turn('user', 'b'), 'beta');
    expect([...m.listSessions()].sort()).toEqual(['alpha', 'beta']);
  });

  it('skips a corrupted file gracefully (starts empty + warning)', async () => {
    await fs.writeFile(testFile, 'not-json{{{', 'utf-8');
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    const r = await m.recall({ text: '', sessionId: 's1' });
    expect(r).toEqual([]);
    // Subsequent record should overwrite the corrupted file.
    await m.record(turn('user', 'fresh'), 's1');
    const onDisk = JSON.parse(await fs.readFile(testFile, 'utf-8'));
    expect(onDisk.sessions['s1'][0].text).toBe('fresh');
  });

  it('returns recent N turns honoring MemoryQuery.limit', async () => {
    const m = new DurableFileMemoryProvider({ filePath: testFile });
    for (let i = 0; i < 8; i++) {
      await m.record(turn('user', `m-${i}`, `2026-01-01T00:00:0${i}Z`), 's1');
    }
    const r = await m.recall({ text: '', sessionId: 's1', limit: 3 });
    expect(r).toHaveLength(3);
    expect(r[0]!.summary).toContain('m-5');
    expect(r[2]!.summary).toContain('m-7');
  });
});
