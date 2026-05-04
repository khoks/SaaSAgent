/**
 * UI Composer implementations (per ADR-012).
 *
 * MVP plan:
 *   - StubComposer (Phase 1.1) — returns hand-crafted layouts; used for protocol-loop validation.
 *   - HaikuComposer (Phase 1.3) — Haiku model + cached layout templates per canonical intent.
 *   - SonnetFallbackComposer (Phase 1.3) — Sonnet for novel intents (no template cache hit).
 */

export { StubComposer } from './stub.js';
