import { describe, it, expect } from 'vitest';
import type {
  AtomicComponentRegistry,
  ThemeRegistration,
} from '@saasagent/protocol';
import { buildComposerSystemPrompt } from './prompt.js';

const tinyRegistry: AtomicComponentRegistry = {
  version: '1.0.0',
  components: {
    Card: {
      name: 'Card',
      version: '1.0.0',
      framework: 'react',
      semanticRole: 'container',
      whenToUse: 'always as the root of a layout',
      propsSchema: { type: 'object', properties: { title: { type: 'string' } }, required: [] },
      moduleSpecifier: '@host/components',
      exportName: 'Card',
    },
  },
};

const tinyTheme: ThemeRegistration = {
  name: 'walmart',
  version: '1.0.0',
  tokens: {
    color: {
      brand: { primary: { $value: '#0071dc', $type: 'color' } },
    },
    spacing: { md: { $value: '16px', $type: 'dimension' } },
  },
};

describe('buildComposerSystemPrompt', () => {
  it('returns 3 cacheable blocks when no registry passed (placeholders only)', () => {
    const blocks = buildComposerSystemPrompt();
    expect(blocks).toHaveLength(3);
    expect(blocks.every((b) => b.cache)).toBe(true);
    expect(blocks[1]?.text).toContain('Phase 1.4 placeholder set');
  });

  it('renders the registered components when registry is non-empty', () => {
    const blocks = buildComposerSystemPrompt(tinyRegistry);
    expect(blocks).toHaveLength(3);
    expect(blocks[1]?.text).toContain('Card');
    expect(blocks[1]?.text).toContain('container');
    expect(blocks[1]?.text).toContain('always as the root of a layout');
    expect(blocks[1]?.text).toContain('registry version 1.0.0');
  });

  it('adds a theme tokens block when theme is non-empty (4 blocks total)', () => {
    const blocks = buildComposerSystemPrompt(tinyRegistry, tinyTheme);
    expect(blocks).toHaveLength(4);
    const themeBlock = blocks[2]?.text ?? '';
    expect(themeBlock).toContain('walmart');
    expect(themeBlock).toContain('version 1.0.0');
    expect(themeBlock).toContain('color.brand.primary');
    expect(themeBlock).toContain('#0071dc');
    expect(themeBlock).toContain('spacing.md');
    expect(themeBlock).toContain('16px');
  });

  it('omits the theme block when theme has no tokens', () => {
    const empty: ThemeRegistration = { name: 'default', version: '0.0.0', tokens: {} };
    const blocks = buildComposerSystemPrompt(tinyRegistry, empty);
    expect(blocks).toHaveLength(3);
  });

  it('every block is marked cacheable so the Anthropic prompt cache hits on stable prefixes', () => {
    const blocks = buildComposerSystemPrompt(tinyRegistry, tinyTheme);
    expect(blocks.every((b) => b.cache === true)).toBe(true);
  });
});
