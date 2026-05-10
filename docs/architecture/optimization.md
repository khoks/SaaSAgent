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

## Observed performance (Phase 1.3–2.7, 2026-05-10)

| Operation | Observed latency | Notes |
|---|---|---|
| `claude-haiku-4-5` compose (live API, empty cache) | ~2.3–2.5 s | Per Phase 1.3 smoke; includes one API round-trip |
| `claude-sonnet-4-6` plan + tool call (Phase 2.1c) | ~370–430 ms per tool call | Measured via `[sonnet-planner] tool__<name>(...) → ok (Nms)` logs |
| Sub-agent federation round-trip (Phase 2.4.x) | ~340–8164 ms | Child's tool call 340ms; full parent→child→tool chain 8s when child also runs Sonnet |
| Direct Anthropic API call (Phase 1.3 standalone test) | 728 ms | For a minimal `claude-haiku-4-5` message |
| pnpm build (all 8 packages) | ~1.1–2.3 s | Turborepo cached; cold build ~8-12 s |

## Cost levers implemented

- **Anthropic prompt cache (`cache_control: {type: "ephemeral"}`)** — system prefix (atomic component registry + theme tokens + feature registry) cached at the API level. Cache hit eliminates re-encoding the stable prefix. Effective once registry size exceeds the 4096-token minimum cacheable prefix for Haiku 4.5.
- **Application-level `CompositionCache`** — LRU keyed by canonical intent fingerprint; returns a cached `ComposedLayout` with a fresh `composeCycleId` on hit, bypassing the LLM call entirely. Invalidated on DS version, theme, or feature registry change.
- **Two-model strategy** — `claude-haiku-4-5` for composition (cheap, fast); `claude-sonnet-4-6` for planning (higher reasoning quality). The planner is invoked once per conversation turn; the composer is invoked per compose-cycle (often the same, but distinct concerns).
- **Token-bucket rate limiting** — per source IP, prevents runaway client behavior from consuming Anthropic API budget. Configurable burst + fill-rate.

## Known hot paths to address

- **StubComposer/StubPlanner fallback** when `ANTHROPIC_API_KEY` is not in the runtime process's environment — happens on Windows when the key is set in the interactive shell but not inherited by Claude Code's subprocess. Document and fix the env-var injection path for dev convenience.
- **WebSocket token via query param** exposes the bearer token in server logs (URL logging). Phase 3 should add a short-lived signed handshake token for the WS upgrade.
- **Implicit re-ask 8-second window** is a fixed default — travel-planning sessions have longer think-time between turns; an overly-aggressive window will generate false-positive negative signals. Needs per-tenant tuning knob documented in the admin UI.

## Enterprise onboarding surface (validated 2026-05-10)

End-to-end Expedia integration test (`apps/demo-expedia/`) quantified the minimum viable enterprise integration surface:

| Onboarding task | Mechanism | LOC |
|---|---|---|
| Register 5 in-process skills + 1 sub-agent descriptor, start runtime | `start-runtime.mjs` via `@saasagent/runtime` | ~30 |
| Define a domain sub-agent with its own skill | `start-trip-planner.mjs` via `@saasagent/sdk` `defineSubAgent` | ~40 |
| Seed feature.md + tool descriptors from host page | `POST /runtime/features` + `POST /runtime/tools` on boot | ~15 |

**What was verified live in Chrome (Expedia scenario):**
- All 5 registered skills callable via direct REST (`POST /executor/skill/<name>`)
- Sub-agent skill callable directly on its port (`POST /executor/skill/build-itinerary` → full 4-day Tokyo itinerary)
- P-001 compose-cycle-id binding: every post-handshake emit carries the most-recent broadcast cycle id
- P-004 implicit re-ask: second user message within 8s window increments `evalSignalCount` (`negative/user-implicit`)
- Custom semantic events (`flight-shortlisted`, `hotel-shortlisted`, `activity-shortlisted`, etc.) with structured payloads flow through unmodified
- Mobile context auto-emit (`deviceClass`, `viewportWidth`, `inputMode`, `networkClass`) works without host code

**Five onboarding gaps found (priority order for enterprise adoption):**
1. *(highest)* No stub-mode signal in `/health` — devs think the platform is broken when `ANTHROPIC_API_KEY` is absent
2. `/federate` returns `{}` when sub-agent planner is stub — indistinguishable from a federation failure
3. Pre-handshake events get `cycle=no-cycle` — P-001 silently broken for any event dispatched before WS opens
4. Skill execution path is `/executor/skill/<name>`, not the conventional `/skills/<name>/execute`
5. *(lowest)* Skill input goes in body root, not under `{input:...}` — non-obvious without docs

All five are captured in `docs/requirements/future-requirements.md`.

> The `extract-insights` skill appends entries as conversations surface new performance data, cost observations, or scaling decisions.
