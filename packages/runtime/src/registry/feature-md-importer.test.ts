import { describe, it, expect } from 'vitest';
import { importFeatureMarkdown } from './feature-md-importer.js';

describe('importFeatureMarkdown', () => {
  it('parses a minimal front matter + body', () => {
    const md = `---
name: product-search
version: 1.0.0
summary: Search the catalog
whenRelevant: When user wants to discover products
---

# Product Search

The catalog supports faceted search.`;

    const f = importFeatureMarkdown(md);
    expect(f.name).toBe('product-search');
    expect(f.version).toBe('1.0.0');
    expect(f.summary).toBe('Search the catalog');
    expect(f.whenRelevant).toBe('When user wants to discover products');
    expect(f.content).toBe('# Product Search\n\nThe catalog supports faceted search.');
  });

  it('parses multi-line literal blocks (key: |)', () => {
    const md = `---
name: x
summary: short
whenRelevant: |
  This is a multi-line
  description that spans
  three lines.
---

body here`;
    const f = importFeatureMarkdown(md);
    expect(f.whenRelevant).toBe('This is a multi-line\ndescription that spans\nthree lines.');
  });

  it('parses inline string arrays (tags)', () => {
    const md = `---
name: x
summary: s
whenRelevant: w
tags: [search, catalog, "discovery"]
---

body`;
    const f = importFeatureMarkdown(md);
    expect(f.tags).toEqual(['search', 'catalog', 'discovery']);
  });

  it('strips quotes from quoted scalars', () => {
    const md = `---
name: "x"
summary: 'a value: with colon'
whenRelevant: w
---

body`;
    const f = importFeatureMarkdown(md);
    expect(f.name).toBe('x');
    expect(f.summary).toBe('a value: with colon');
  });

  it('handles ownerTeam optional field', () => {
    const md = `---
name: x
summary: s
whenRelevant: w
ownerTeam: payments
---

body`;
    const f = importFeatureMarkdown(md);
    expect(f.ownerTeam).toBe('payments');
  });

  it('defaults version to 0.0.0 when omitted', () => {
    const md = `---
name: x
summary: s
whenRelevant: w
---

body`;
    expect(importFeatureMarkdown(md).version).toBe('0.0.0');
  });

  it('throws when front matter is missing', () => {
    expect(() => importFeatureMarkdown('# just markdown, no front matter')).toThrow(
      /front-matter/,
    );
  });

  it('throws when name is missing', () => {
    const md = `---
summary: s
whenRelevant: w
---

body`;
    expect(() => importFeatureMarkdown(md)).toThrow(/name/);
  });

  it('throws when summary is missing', () => {
    const md = `---
name: x
whenRelevant: w
---

body`;
    expect(() => importFeatureMarkdown(md)).toThrow(/summary/);
  });

  it('handles CRLF line endings', () => {
    const md = `---\r\nname: x\r\nsummary: s\r\nwhenRelevant: w\r\n---\r\n\r\nbody content`;
    const f = importFeatureMarkdown(md);
    expect(f.name).toBe('x');
    expect(f.content).toBe('body content');
  });

  it('skips comment lines and blanks in front matter', () => {
    const md = `---
# this is a comment
name: x

summary: s
# another comment
whenRelevant: w
---

body`;
    const f = importFeatureMarkdown(md);
    expect(f.name).toBe('x');
    expect(f.summary).toBe('s');
    expect(f.whenRelevant).toBe('w');
  });
});
