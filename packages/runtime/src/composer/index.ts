/**
 * UI Composer implementations (per ADR-012).
 *
 *   - StubComposer (Phase 1.1)  — deterministic hand-crafted layouts; protocol-loop validation.
 *   - HaikuComposer (Phase 1.3) — claude-haiku-4-5 + cached templates + claude-sonnet-4-6 fallback.
 */

export { StubComposer } from './stub.js';
export { HaikuComposer, type HaikuComposerOptions } from './haiku.js';
export { CompositionCache, canonicalIntent, type CompositionCacheOptions } from './cache.js';
export { parseLayoutNode, type ParseLayoutResult } from './parse.js';
export { buildComposerSystemPrompt } from './prompt.js';
