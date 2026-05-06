# Phase 1.4 self-review (2026-05-05)

Honest review after running the demo end-to-end with HaikuComposer + a populated
e-commerce registry + a Walmart-archetype theme. Findings, not polish.

## What works well
- **Registry pattern is clean and reusable.** `ComponentRegistryStore` and
  `ThemeRegistryStore` both follow the same shape (in-memory, bump-only version,
  `get / replace / clear`, REST `GET / PUT / DELETE`, CORS). Phase 2's Skills +
  Tools registries can copy this shape line-for-line.
- **Cache-key compositionality.** `${componentsVersion}::${themeVersion}::${intent}`
  invalidates the cache automatically when EITHER registry changes. No manual
  invalidation logic anywhere. This pattern extends naturally to additional
  context fields (planner, memory, feature hints) by appending more version
  segments.
- **Composer respects the registry vocabulary.** Live test confirmed: only
  registered primitives in the output, off-brand components not invented. ADR-005's
  promise is mechanically true.
- **Error envelope flow is robust.** ProviderError → typed-JSON SSE event
  (`composer-error`) → shell banner. The category-name discriminator avoids the
  EventSource native-error collision cleanly.

## Critical gap (drives Phase 2.0a priority)
**The shell has no text input.** The full conversational loop today is:
1. Shell connects → runtime auto-composes a "welcome" layout
2. User clicks a button in the layout → WS emit → re-compose

Steps (1) and (2) imply the welcome layout MUST include buttons for the user to
have any way to drive the conversation. But on a literal "welcome" intent, the
composer correctly judges there's no concrete user intent yet → produces a
greeting with no buttons (verified live: Card + PageHeading + BodyText, zero
interactive elements). The user is **stranded**. They can read the greeting and
do nothing.

The current loop is "click-only." Real agents are conversational. Phase 2.0a must
ship a permanent text input in the shell that emits `InstructionEnvelope` with
`type: "user-message"` and the typed text in `payload.text`. Without this, every
Phase 2 piece (planner, skills, tools, memory, features) is theoretical — there's
no way for a user to issue an intent the planner can route on.

## Smaller findings (not blocking, but worth tracking)

### Composer should hint at always including an entry point on stateless intents
Even with a text input added (Phase 2.0a), the welcome layout dead-end is unhelpful.
The system prompt should encourage at least one CTA on stateless / cold-start
intents so the user can choose between typing OR tapping. Easy edit in `prompt.ts`.

### `buildContext` only fills 3 of ~6 ComposeContext fields
`packages/runtime/src/transport/server.ts` builds ComposeContext with only:
`components` + `theme` + `conversationContext.intent`. Missing today:
- `conversationContext.narrative` (planner output — Phase 2.1)
- `conversationContext.recentTurns` (memory recall — Phase 2.3)
- `conversationContext.memoryRecall` (memory recall — Phase 2.3)
- `featureHints` (Features/Services registry — Phase 2.2)
- `mobileContext` (DOM observation — Phase 5)
- `previousLayout` (re-render context — could add cheap)

`previousLayout` is the cheapest win — the server could keep the last broadcast
layout in memory and pass it on re-compose. Would let the composer "diff" rather
than always rebuild from scratch. Defer to Phase 2.1.

### Renderer mounts placeholders, not actual host components
`packages/web-shell/src/renderer.ts` emits `<div data-component="ProductTile">…</div>`
divs, NOT the actual host React/Vue/WC component. This is fine for protocol
validation but a real demo against a real e-commerce host needs the multi-framework
mount path per ADR-010. **Defer to Phase 1.4.5 / Phase 3.** Not in Phase 2 critical
path because the protocol loop is already proven.

### No conversation-thread state in the runtime
Each composer call is stateless. The runtime doesn't hold "this is conversation
ABC, message 4 of N." That's fine in Phase 1.4 (every layout is a fresh standalone
artifact) but the planner needs it: a conversationId so memory recall is scoped,
recentTurns are accumulated per thread, etc. Phase 2.1 must introduce this.

### No telemetry / observability
We see model latency in smoke logs but nothing structured. Phase 2.4 (eval) will
add ClickHouse-backed telemetry per ADR-008/023 — out of Phase 2 critical path.

### `composer.compose` falls back to Sonnet only on JSON parse failure
Quality issues (off-brand component, mismatched props, semantic miss) don't
trigger the fallback because they parse fine. v1 might add an LLM-judge gate.
Out of Phase 2 critical path.

### Welcome-on-connect happens in handler, not as a Plan
`handleRequest` calls `composer.compose('welcome', …)` directly. Once the planner
exists (Phase 2.1), this should become `planner.handle('welcome', …)` which
internally decides "this needs a UI compose, no skills" and routes there. Means
SSE-on-connect path needs to be re-routed in Phase 2.1.

## Phase 2 priority (revised by this review)

| Sub-phase | What | Why this order |
|---|---|---|
| **2.0a** | Shell text input → `user-message` InstructionEnvelope | Unblocks all conversational testing. ~30 LOC + tests. |
| **2.0b** | Skills + Tools registries (storage + REST + version-key in cache) | Same pattern as components/theme; cheap; gives planner things to invoke. No execution yet — just registration. |
| **2.0c** | Skill + Tool **executors** (in-process StubSkill, HTTP fetch Tool) | Now planner has a concrete invocation surface. |
| **2.1**  | Sonnet Planner: intent → Plan (Skills/Tools to invoke + final compose) → execute | Replaces direct `compose` call. |
| **2.2**  | `.feature.md` Features/Services registry — planner reads relevant docs as context | Domain workflow knowledge enters the planner. |
| **2.3**  | Memory: Postgres raw-log writes + Qdrant semantic recall — planner gets continuity | Cross-session, long-form context. |
| **2.4+** | Federated Sub-Agents, embedded eval scoring, etc. | Heavier; not on MVP-of-MVP path. |

This turn ships **2.0a + 2.0b**. Next turn ships **2.0c + 2.1** together (planner
isn't useful without executors).
