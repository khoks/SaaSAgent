# Optimization, Scaling & Infrastructure

> Living document. Auto-maintained by the `extract-insights` skill when conversations touch performance, scaling, infra, or cost optimization.

## Performance hot paths (anticipated)
- **First widget render** after user turn — perceived latency anchor.
- **DOM observation cost** — must not bog down host page.
- **Memory recall** — bounded latency for cross-session lookups.
- **Streaming token rate** — must keep up with model output.
- **Tool / sub-agent fan-out** — parallel execution where dependencies allow.

## Scaling axes (anticipated)
- **Tenants** — number of host enterprises on the platform.
- **Concurrent users per tenant** — peak simultaneous conversations.
- **Memory volume per user** — long-tail of cross-session history.
- **Registry size per tenant** — how many skills, sub-agents, tools, widgets, features.

## Cost levers (anticipated)
- Prompt caching (Anthropic).
- Model selection per task (Haiku for cheap routing, Sonnet for orchestration, Opus for hard reasoning).
- Memory retrieval bounded by relevance + recency.
- Widget protocol size (server-driven vs. shipped components).
- Speculative execution vs. confirm-first.

## Open questions
- Where does the orchestrator run physically (edge / region / origin)?
- How aggressively do we cache plans for similar intents?
- How do we prevent a runaway proactive engine from blowing the cost budget?
- Per-tenant cost caps + circuit breakers — design needed.

---

## Validated optimizations (from Phase 1–6 implementation, 2026-05-07)

### Anthropic prompt caching — minimum cacheable prefix
- Haiku 4.5 requires a **minimum 4096-token prefix** to trigger API-level prompt caching (`cache_control: {type: "ephemeral"}`). The composer's stable system prefix (atomic-component registry + theme tokens) will not hit this threshold until Phase 1.4 when the registry fills out. Design for caching from Phase 1.3 but do not expect cache hits in dev/demo with sparse registries.
- Sonnet 4.6 has the same minimum; the planner's system prompt with a full Feature/Service registry will exceed it in production.
- **Render order for cache:** tools → system → messages. Place `cache_control` blocks at the boundary between stable prefix (registry, theme, feature docs) and variable suffix (conversation history, tool results).
- **Source:** Phase 1.3 implementation + `claude-api` skill consultation 2026-05-08.

### Application-level CompositionCache
- **LRU cache keyed by canonical intent fingerprint** (hash of intent string + component-registry version + theme version).
- Stores full typed-JSON `ComposedLayout` directly — cache hit returns a new `composeCycleId` on top of the cached layout.
- **Invalidation triggers:** design-system version bump, theme token change, Feature/Service doc edit.
- Cold-start (novel intent, cache miss) falls through to Haiku; still-novel intents fall through to Sonnet 4.6 fallback.
- **Source:** ADR-012; validated in Phase 1.3 / 1.4.

### Recursive schema constraint on Anthropic structured-outputs
- `LayoutNode.children: LayoutNode[]` is recursive. Anthropic's structured-outputs surface (`output_config.format`) does **not** support recursive schemas.
- **Workaround in use:** raw JSON output steered by system prompt + Zod-based runtime validation + retry on parse failure. Acceptable tradeoff; revisit if Anthropic adds recursive-schema support.
- **Source:** ADR-012 refinement; Phase 1.3 implementation.

### DOM observation ring-buffer per WS session
- MutationObserver and IntersectionObserver events arrive at high frequency on complex host pages. To prevent flooding the planner, the runtime maintains a **ring-buffer per WS connection** for DOM events.
- `dom-mutation`, `dom-intersection`, and `dom-semantic` envelopes are buffered; the planner is not invoked for every DOM event — only when a composition cycle is triggered by a user instruction or a proactive engine signal.
- **Source:** Phase Bucket A / ADR-022 implementation.

### Prefix-discriminated routing — zero branching in dispatch
- The SonnetPlanner exposes `skill__<name>`, `tool__<name>`, `subagent__<name>` tool names to the model. The `ToolMapper.classify()` function splits on `__` prefix and dispatches to the correct executor in O(1) — no conditional per-capability logic.
- Adding a new tier in the future requires: (a) a new prefix constant, (b) a new executor class, (c) one new branch in `ToolMapper` — nothing else.
- **Source:** Phase 2.1b / P-002 disclosure.

### Server-side quota enforcement before planner invocation (Phase 7)
- When a user message arrives and the session's tier quota is already exhausted, the runtime **does not invoke the planner or UI Composer at all** — it immediately returns a synthetic `quota-exceeded` layout composed by the server directly (no model call). This prevents model spend on blocked turns entirely.
- The quota check is in the WS user-message handler (`packages/runtime/src/transport/server.ts`), before the planner `plan()` call. Order: quota check → (if denied) synthesize layout → broadcast → return; (if allowed) quota consume → planner → composer → broadcast.
- **Source:** Phase 7 session 2026-05-12 — "The layout content shows 'You asked: quota-exceeded' — confirms the planner was NOT invoked on the rejected turn." ADR-041.

### QuotaBanner — zero-overhead quota display via shell-side state update
- Quota remaining is rendered by a persistent `QuotaBanner` web-component in the WC shell; it reads `quotaStatus: {remaining, limit, tier, resetsAt, state}` directly from the SSE `ComposedLayoutMetadata` payload on every incoming layout event.
- No extra planner round-trip or extra HTTP call is needed — the counter is piggy-backed on the already-in-flight layout event. Three visual states (`fine` / `warning` / `exceeded`) are pure CSS class toggles in the shell; no LLM or composer involvement.
- **Source:** ADR-041; Phase 7 verification — "**QuotaBanner is visible: '4 of 5 requests remaining today (free tier).'**"

### CapabilityEvalRunner ring buffer — bounded per-capability memory
- `InMemoryCapabilityEvalRunner` maintains a fixed-size FIFO ring buffer (default: 100 entries) **per registered capability**. On every executor `onInvocation` callback, the oldest entry is evicted when the buffer is full.
- This bounds memory usage to `O(capabilities × ring_buffer_size)` regardless of server uptime or traffic volume — no unbounded accumulation.
- Three heuristics are auto-generated per invocation with zero configuration: `outcome-success` (no thrown exception / error envelope), `output-non-empty` (non-null and non-empty result.output), `latency-budget` (p95 < 2s default, host-configurable). No LLM call required for baseline quality monitoring.
- **Source:** ADR-040; Phase 6 verification — "6 capabilities tracked (5 skills + 1 sub-agent + 1 tool). Worst-first ordering puts the failing ones at the top." PR #36.

### Per-WS proactive tick — session-scoped GC via interval lifetime
- The `ProactiveEngine` runs on a **per-WS 5-second `setInterval`** spawned in the WS `connection` handler, with a closure over per-session state (`lastUserMessageAt`, `evalSignalCount`, `domEventCount`, `sessionDepth`). The interval is explicitly cleared in the WS `close` handler.
- This model costs one JS microtask per 5s per active WS connection — negligible. The interval's lifetime is exactly the WS session lifetime, so there is no stale-reference or memory-leak risk when connections drop.
- Alternative (global cron across all sessions) would require a session registry with lock-contention; per-WS interval eliminates that complexity.
- **Source:** ADR-042; Phase 5 implementation in `packages/runtime/src/transport/server.ts`.
