import { describe, it, expect } from 'vitest';
import type { SkillDescriptor, ToolDescriptor } from '@saasagent/protocol';
import {
  descriptorsToTools,
  parseToolName,
  qualifyToolName,
  SKILL_PREFIX,
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

  it('throws when the qualified name exceeds 64 chars', () => {
    const longName = 'a'.repeat(60);
    expect(() => qualifyToolName('skill', longName)).toThrow(/64-char/);
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
});
