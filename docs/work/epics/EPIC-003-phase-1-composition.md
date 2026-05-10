# EPIC-003 — Phase 1 Composition layer

- **Status:** done
- **Created:** 2026-05-10
- **Last updated:** 2026-05-10
- **Completed:** 2026-05-10
- **Parent initiative:** [INIT-003 — Build MVP runtime + embeddable shell](../initiatives/INIT-003-build-mvp.md)

## Outcome
Full bidirectional typed-JSON composition loop running in a real browser: protocol package, SSE+WS transport, HaikuComposer with Anthropic provider abstraction, AtomicComponentRegistry, ThemeRegistryStore (DTCG + Style Dictionary importer), ErrorEnvelope, and a Vite-bundled demo host verified live in Chrome.

## Why
Phase 1 is the "MVP-of-MVP gate" prerequisite — without a working composition loop, planning (Phase 2) cannot be integrated.

## Done when (all satisfied)
- ✅ `@saasagent/protocol` package with typed LayoutNode, ComposedLayout, InstructionEnvelope, ErrorEnvelope
- ✅ SSE endpoint streams composed layouts; WS endpoint receives typed instruction envelopes
- ✅ HaikuComposer calls Anthropic API; MockProvider/StubComposer for offline testing
- ✅ AtomicComponentRegistry: REST PUT/GET/POST/DELETE `/registry/components` + CORS
- ✅ ThemeRegistryStore: REST `/registry/theme` with DTCG flatten + Style Dictionary + CSS variable importers
- ✅ `apps/demo-host` Vite-bundled browser demo; `<saas-agent>` WC mounts and renders layouts from registry primitives
- ✅ Shell renders ErrorEnvelope as in-panel error banner
- ✅ Live Chrome verification: SSE → layout → click → WS → re-compose → re-render loop proven

## Sub-phases shipped
| Sub-phase | Commit | What |
|---|---|---|
| 1.1 | `5a4c97c` | Protocol package + stub composer + layout renderer |
| 1.2 | `b796d02` | Real SSE + WebSocket transport |
| 1.3 | `aed268f` | HaikuComposer + AnthropicProvider + ModelProvider abstraction |
| 1.3.1 | `d39e3d4` | ErrorEnvelope + SSE composer-error events |
| 1.4.0 | `d49241a` | apps/demo-host Vite-bundled browser demo |
| 1.4.1 | `705885a` | AtomicComponentRegistry + REST API + CORS |
| 1.4.2 | `a24a29c` | ThemeRegistryStore + DTCG flatten + composer theme prompt |
| 1.4.3 | `e813673` | Shell error banner on ErrorEnvelope |
| 1.4.4 | `31da46a` | Style Dictionary + CSS variables importers |
