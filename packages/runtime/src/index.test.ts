import { describe, it, expect } from 'vitest';
import { Runtime, VERSION } from './index.js';

describe('Runtime (Phase 0 skeleton)', () => {
  it('exports a version', () => {
    expect(VERSION).toBe('0.0.0');
  });

  it('constructs with empty config', () => {
    const runtime = new Runtime({});
    expect(runtime).toBeInstanceOf(Runtime);
    expect(runtime.config).toEqual({});
  });
});
