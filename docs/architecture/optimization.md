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

## Validated optimization patterns (from MVP build phases 1–6, 2026-05-06)

### Two-level composition cache (Phase 1.3)
- **L1 — Application-level `CompositionCache`:** LRU keyed on canonical intent fingerprint (normalized user-text → hash). Stores the full typed-JSON `ComposedLayout` directly. Cache hit returns in <1ms with a fresh `composeCycleId`. Invalidation triggers: design-system version bump, theme-token change, Feature/Service doc edit.
- **L2 — Anthropic prompt cache (`cache_control: {type: "ephemeral"}`):** Stable system prefix (atomic-component registry + theme tokens) marked cacheable. Saves 80–90% of input-token cost on the stable prefix on subsequent calls. Min cacheable prefix on `claude-haiku-4-5` is 4096 tokens — effectively activates once the component registry grows beyond ~50 entries.
- **Combined effect:** warm e-commerce flows (product comparison, returns, cart review) should hit L1 and cost effectively zero per additional compose cycle.

### Raw-JSON output + Zod validation for recursive schema (Phase 1.3)
- `LayoutNode.children: LayoutNode[]` is a recursive type. Anthropic's structured-output surface (`output_config.format`) does not support recursive schemas.
- Decision: raw JSON output steered by system prompt + `extractFirstJsonObject` helper + `Zod.safeParse` at runtime + one retry on validation failure. **No structured outputs used for composition.**
- If Anthropic adds recursive-schema support, L2 cache-hit rate will increase slightly (more deterministic output format). Not blocking.

### DOM observation throttle + ring buffer (Phase A.3)
- MutationObserver throttled to 200ms (default) and payload-bounded to 1KB per mutation. Prevents chatty host pages from creating a high-frequency event stream.
- Per-WS ring buffer (20 entries, FIFO) at the runtime WS intercept layer. DOM envelopes populate the buffer but do NOT trigger a compose cycle. The planner reads the buffer on the next user-initiated or proactive turn.
- **Result:** the host page can have highly interactive DOM (carousels, live price updates) without any impact on model call frequency.

### Token-bucket rate limiting per IP (Phase 2.7)
- `RateLimiter` class: configurable `capacity` (default 60 tokens) and `refillRate` (default 1 token/second). Applied at the HTTP layer after auth.
- Prevents any single client IP from exhausting the Anthropic API quota for the whole tenant.
- Per-tenant cost caps + circuit breakers are still an open design question (see open questions above).

### Implicit eval signal — zero-cost quality labeling (Phase 2.5.x)
- Re-ask within `RASK_WINDOW_MS` (default 8000ms) after a layout broadcast → automatic `negative/user-implicit` EvalSignal on the prior `composeCycleId`.
- Delivers a consistent stream of quality labels without any user action.
- False-positive rate (quick follow-up vs. frustrated re-ask) is mitigated by weighting implicit signals lower than explicit thumbs in `WeightedFeatureChurnCalculator`.
- **Optimization implication:** eval coverage rate approaches 100% of conversations from day 1; no cold-start gap in the quality-signal pipeline.

### `WeightedFeatureChurnCalculator` warm-start training (Phase 2.6.x)
- The calculator uses a sigmoid of a weighted linear combination of eval features. Initial weights are hand-tuned; `trainChurnWeights(labeledData, options)` performs gradient descent (configurable `epochs`, `learningRate`, L2 `lambda`) to replace them.
- Deterministic seed (`sfc32` PRNG) ensures reproducible results in tests.
- **Migration path to LightGBM (ADR-031):** once a tenant has ~1k labeled events, `trainChurnWeights()` produces weights that should closely match a logistic-regression baseline. Switch to LightGBM is a constructor-level swap.

> The `extract-insights` skill appends new entries as conversations surface them.
