import { describe, it, expect, vi } from 'vitest';
import type { SkillDescriptor, SubAgentDescriptor, ToolDescriptor } from '@saasagent/protocol';
import {
  buildToolNameResolver,
  descriptorsToTools,
  isApiValidToolName,
  parseToolName,
  qualifyToolName,
  sanitizeNameSegment,
  SKILL_PREFIX,
  SUBAGENT_PREFIX,
  TOOL_PREFIX,
} from './tool-mapper.js';

const priceCompare: SkillDescriptor = {
  name: 'price-compare',
  version: '1.0.0',
  description: 'Compare prices across two products',
  whenToUse: 'when the user wants to compare two products on price',
  kind: 'in-process',
  inputSchema: {
    type: 'object',
    properties: { a: { type: 'string' }, b: { type: 'string' } },
    required: ['a', 'b'],
  },
};

const cartSummary: SkillDescriptor = {
  name: 'cart-summary',
  version: '1.0.0',
  description: 'Summarize the cart',
  whenToUse: 'when the user asks about their cart',
  kind: 'in-process',
};

const getProduct: ToolDescriptor = {
  name: 'get-product',
  version: '1.0.0',
  description: 'Fetch product details',
  whenToUse: 'when the planner needs product data',
  method: 'GET',
  urlTemplate: 'https://api.host.com/products/{id}',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' } },
    required: ['id'],
  },
};

describe('qualifyToolName + parseToolName', () => {
  it('round-trips a skill name', () => {
    const q = qualifyToolName('skill', 'price-compare');
    expect(q).toBe(`${SKILL_PREFIX}price-compare`);
    expect(parseToolName(q)).toEqual({ kind: 'skill', name: 'price-compare' });
  });

  it('round-trips a tool name', () => {
    const q = qualifyToolName('tool', 'get-product');
    expect(q).toBe(`${TOOL_PREFIX}get-product`);
    expect(parseToolName(q)).toEqual({ kind: 'tool', name: 'get-product' });
  });

  it('parseToolName returns null for unprefixed names', () => {
    expect(parseToolName('something-else')).toBeNull();
    expect(parseToolName('')).toBeNull();
  });

  it('throws when the qualified name exceeds 128 chars (Anthropic limit)', () => {
    // skill__ prefix is 7 chars; 122 + 7 = 129 → over limit
    const longName = 'a'.repeat(122);
    expect(() => qualifyToolName('skill', longName)).toThrow(/128-char/);
  });

  it('accepts names that fit within the 128-char limit', () => {
    const ok = 'a'.repeat(120);
    expect(() => qualifyToolName('skill', ok)).not.toThrow();
  });
});

describe('sanitizeNameSegment + Anthropic regex compliance', () => {
  it('passes through names that are already API-compliant', () => {
    expect(sanitizeNameSegment('price-compare')).toBe('price-compare');
    expect(sanitizeNameSegment('snake_case')).toBe('snake_case');
    expect(sanitizeNameSegment('camelCase123')).toBe('camelCase123');
  });

  it('replaces dots with underscores (the user-reported failure mode)', () => {
    expect(sanitizeNameSegment('expedia.search-flights')).toBe('expedia_search-flights');
    expect(sanitizeNameSegment('a.b.c')).toBe('a_b_c');
  });

  it('replaces other invalid chars (/ : space etc.) with underscores', () => {
    expect(sanitizeNameSegment('foo/bar')).toBe('foo_bar');
    expect(sanitizeNameSegment('foo:bar')).toBe('foo_bar');
    expect(sanitizeNameSegment('foo bar')).toBe('foo_bar');
    expect(sanitizeNameSegment('!@#$%^&*()')).toBe('__________');
  });

  it('qualifyToolName sanitizes embedded dots (regression test for the reported bug)', () => {
    const q = qualifyToolName('skill', 'expedia.search-flights');
    expect(q).toBe('skill__expedia_search-flights');
    expect(isApiValidToolName(q)).toBe(true);
  });

  it('every output of qualifyToolName passes the Anthropic regex', () => {
    const inputs = [
      ['skill', 'expedia.search-flights'],
      ['tool', 'foo/bar:baz'],
      ['subagent', 'travel-planner@v1'],
      ['skill', 'has spaces in it'],
      ['skill', 'price-compare'], // already valid — no-op
    ] as const;
    for (const [kind, name] of inputs) {
      expect(isApiValidToolName(qualifyToolName(kind, name))).toBe(true);
    }
  });
});

describe('buildToolNameResolver', () => {
  const sFooBar: SkillDescriptor = {
    name: 'expedia.search-flights',
    version: '1.0.0',
    description: '...',
    whenToUse: '...',
    kind: 'in-process',
  };
  const tGetProduct: ToolDescriptor = {
    name: 'foo/bar',
    version: '1.0.0',
    description: '...',
    whenToUse: '...',
    method: 'GET',
    urlTemplate: 'http://x/',
  };

  it('maps sanitized qualified name back to original {kind, name}', () => {
    const r = buildToolNameResolver(
      { version: '1.0.0', skills: { 'expedia.search-flights': sFooBar } },
      { version: '1.0.0', tools: { 'foo/bar': tGetProduct } },
    );
    expect(r.get('skill__expedia_search-flights')).toEqual({
      kind: 'skill',
      name: 'expedia.search-flights',
    });
    expect(r.get('tool__foo_bar')).toEqual({ kind: 'tool', name: 'foo/bar' });
  });

  it('no-op for names that are already API-compliant', () => {
    const compliant: SkillDescriptor = { ...sFooBar, name: 'price-compare' };
    const r = buildToolNameResolver(
      { version: '1.0.0', skills: { 'price-compare': compliant } },
      { version: '0.0.0', tools: {} },
    );
    expect(r.get('skill__price-compare')).toEqual({ kind: 'skill', name: 'price-compare' });
  });

  it('warns on sanitization collisions (foo.bar and foo_bar collide)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const dotted: SkillDescriptor = { ...sFooBar, name: 'foo.bar' };
      const undered: SkillDescriptor = { ...sFooBar, name: 'foo_bar' };
      const r = buildToolNameResolver(
        { version: '1.0.0', skills: { 'foo.bar': dotted, foo_bar: undered } },
        { version: '0.0.0', tools: {} },
      );
      expect(r.size).toBe(1); // both collapse to skill__foo_bar
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('sanitized-name collision for skill__foo_bar'),
      );
    } finally {
      warn.mockRestore();
    }
  });
});

describe('descriptorsToTools', () => {
  it('returns [] for empty registries', () => {
    const out = descriptorsToTools({ version: '0.0.0', skills: {} }, { version: '0.0.0', tools: {} });
    expect(out).toEqual([]);
  });

  it('emits skills before tools, alphabetical within each group', () => {
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'price-compare': priceCompare, 'cart-summary': cartSummary } },
      { version: '1.0.0', tools: { 'get-product': getProduct } },
    );
    expect(out.map((t) => t.name)).toEqual([
      'skill__cart-summary',
      'skill__price-compare',
      'tool__get-product',
    ]);
  });

  it('formats description as "<desc>\\n\\nWhen to use: <whenToUse>"', () => {
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'price-compare': priceCompare } },
      { version: '0.0.0', tools: {} },
    );
    expect(out[0]!.description).toBe(
      'Compare prices across two products\n\nWhen to use: when the user wants to compare two products on price',
    );
  });

  it("uses the descriptor's inputSchema when present", () => {
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'price-compare': priceCompare } },
      { version: '0.0.0', tools: {} },
    );
    expect(out[0]!.input_schema).toEqual(priceCompare.inputSchema);
  });

  it('falls back to a permissive object schema when inputSchema is missing', () => {
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'cart-summary': cartSummary } },
      { version: '0.0.0', tools: {} },
    );
    expect(out[0]!.input_schema).toEqual({ type: 'object', properties: {} });
  });

  it('preserves the kind→prefix mapping per capability', () => {
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'price-compare': priceCompare } },
      { version: '1.0.0', tools: { 'get-product': getProduct } },
    );
    expect(out[0]!.name.startsWith(SKILL_PREFIX)).toBe(true);
    expect(out[1]!.name.startsWith(TOOL_PREFIX)).toBe(true);
  });

  // Phase 2.4: sub-agents as the third tier.
  it('emits sub-agents after tools with subagent__ prefix and intent/payload schema', () => {
    const travel: SubAgentDescriptor = {
      name: 'travel',
      version: '1.0.0',
      description: 'Travel specialist',
      whenToUse: 'when the user wants to book travel',
      transport: 'http',
      endpoint: 'https://travel.host.com/federate',
    };
    const out = descriptorsToTools(
      { version: '1.0.0', skills: { 'price-compare': priceCompare } },
      { version: '1.0.0', tools: { 'get-product': getProduct } },
      { version: '1.0.0', subAgents: { travel } },
    );
    expect(out.map((t) => t.name)).toEqual([
      'skill__price-compare',
      'tool__get-product',
      'subagent__travel',
    ]);
    const subAgentTool = out[2]!;
    expect(subAgentTool.input_schema).toMatchObject({
      type: 'object',
      properties: { intent: { type: 'string' } },
      required: ['intent'],
    });
  });

  it('parseToolName recognizes subagent__', () => {
    const q = qualifyToolName('subagent', 'travel');
    expect(q).toBe(`${SUBAGENT_PREFIX}travel`);
    expect(parseToolName(q)).toEqual({ kind: 'subagent', name: 'travel' });
  });
});
