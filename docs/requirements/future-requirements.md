# Future Requirements

> Auto-maintained by the `extract-insights` skill. Every future-looking item Rahul or Claude raises in conversation lands here, with date and source.

## Format
Each entry:
```
### [YYYY-MM-DD] Title
**Source:** conversation snippet or summary
**Category:** vision | feature | capability | integration | research | other
**Notes:** rationale, open questions, related decisions
```

## Entries

### [2026-04-26] Proactive agent that pops up unprompted
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Future state — agent decides on its own when the user needs attention or when there is a next-best-action. Requires: continuous insight into host SaaS service catalog, attention-budget engine, confidence gating. To be groomed under FR-P.

### [2026-04-26] Mobile app embedding (parity with web)
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Adobe, Canva, Expedia, Best Buy, Walmart, Shopify all have native mobile apps. Platform must work in mobile contexts, not only web. Native SDK? React Native? WebView bridge? — open.

### [2026-04-26] AI-native stores for time-windowed behavior queries
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** "What was the user doing in the past 2 minutes / 10 minutes / week / year?" Requires purpose-built stores beyond traditional event logs. Architecture-level decision pending.

### [2026-04-26] Cross-session memory of solutions accepted vs. rejected
**Source:** Initial vision dump from Rahul.
**Category:** capability
**Notes:** Memory tracks not just what was said, but which suggestions the user took, which they ignored, and which they pushed back on. Drives personalization and trust calibration over time.

### [2026-04-26] Universal agent surface across an entire app/OS ecosystem (Google-style)
**Source:** Rahul Q1 answer 2026-04-26: "I would have liked to anchor the design for something like the google's app/OS ecosystem, but that is like the ultimate use case."
**Category:** vision
**Notes:** The end-state aspiration: a single agentic substrate operating not inside one host SaaS but **across every app and surface a user touches** (think: Google's app + OS ecosystem — agent that knows your Gmail, Calendar, Maps, Photos, Drive, Android state simultaneously, with cross-app memory and orchestration). MVP is the single-host-embedded model; design today should not foreclose the multi-host future. Implications for: cross-app identity, federated memory, cross-host workflow orchestration, app-discovery protocol.

### [2026-04-26] Federated cross-enterprise learning (opt-in)
**Source:** Implied by ADR-006 self-hosted decision; raised in conversation 2026-04-26.
**Category:** capability
**Notes:** Self-hosted distribution kills cross-customer telemetry by default. Future opt-in mode: enterprises can contribute anonymized pattern data (planner traces, composition templates, skill-usage statistics) to a federated learning pool, in exchange for receiving aggregated improvements. Privacy-preserving (DP / federated aggregation). Strictly opt-in, off by default. Avoids the "self-hosted means no product feedback loop" trap.

### [2026-04-26] Auto-extraction of host design system from existing artifacts
**Source:** Implied by ADR-005; raised in conversation 2026-04-26.
**Category:** capability
**Notes:** Host design-system registration is manual at MVP. Future: auto-extract from Storybook (CSF), Figma design tokens, component metadata files, MDX docs. Reduces onboarding friction substantially.

### [2026-04-26] Cached composition templates per recurring intent
**Source:** Implied by ADR-005 architecture; raised in conversation 2026-04-26.
**Category:** capability / optimization
**Notes:** The UI Composer LLM step is per-turn. For recurring intents (e.g., "show product comparison"), the composed JSON layout tree should be cacheable and reused with new data wiring. Saves model spend and reduces latency.

### [2026-05-10] Production-grade Postgres memory provider with Docker CI
**Source:** Phase 2.3.x shipped DurableFileMemoryProvider + PostgresMemoryProvider stubs; live Postgres was explicitly deferred: "Postgres seam already proven via KeyValueMemoryProvider; real Postgres impl needs CI/Docker infra that's a future deliverable."
**Category:** capability
**Notes:** The `PostgresMemoryProvider` interface and injectable `pg` client exist in the codebase, but the live Postgres integration tests and Docker-CI pipeline are not yet built. Blocked on: spinning up a Postgres container in CI, running schema migrations via `pg`, and wiring the provider into Runtime as the default when `DATABASE_URL` is set. Pre-condition for production memory durability.

### [2026-05-10] WASM skill sandboxing for adapter-supplied code (v1)
**Source:** ADR-021 consequences: "Skills isolation still relevant — handled by process isolation by default within the platform; WASM at v1 for adapter-supplied skill code."
**Category:** capability
**Notes:** In-process skills currently run in the same Node.js process as the runtime (no isolation). For v1, skill handlers supplied by host adapters should execute in a WASM sandbox (e.g., Wasmtime or a Node.js WASM module) to prevent a rogue skill from crashing or reading the runtime's memory. Design: skill-handler interface stays the same; executor wraps the handler in a sandboxed WASM call.

### [2026-05-10] WebRTC voice channel for mic capture + TTS narration (Phase 5)
**Source:** ADR-038 decision: "WebRTC reserved for voice (Phase 5) when microphone capture and TTS narration land; voice has different latency / codec characteristics that warrant a third channel."
**Category:** capability
**Notes:** Phase 5 adds voice as a first-class interaction mode. The architecture reserves WebRTC as a third transport channel (distinct from SSE and WS). Requires: browser `getUserMedia`, WebRTC peer connection, TTS model (or cloud TTS) for narration, planner awareness of voice-vs-text mode, atomic UI components that are voice-navigable.

### [2026-05-10] Native iOS + Android SDKs for mobile-native embedding (v1.5)
**Source:** ADR-017 decision: "v1.5: native SDKs (iOS / Android) for hosts who need full native UX."
**Category:** capability
**Notes:** MVP mobile strategy is WebView bridge + thin native shim. v1.5 delivers full native SDKs (Swift for iOS, Kotlin for Android) for hosts that need deep native integrations: biometrics, push notifications, camera, on-device ML. SDK API surface mirrors the WebView bridge but bypasses the WebView entirely.

### [2026-05-10] OSS publish gate: provisional patents filed before any public release
**Source:** ADR-035: "before any code reaches the public OSS repo, file provisional patent applications for the patentability-strong novel-idea entries."
**Category:** other
**Notes:** The repo must remain private (`khoks/SaaSAgent`) until all Bucket A provisional patents are filed (P-001 through P-005 disclosures are drafted; attorney filing is pending). This is a hard gate on Phase 9 (OSS release). Budget: ~$2–5k per provisional filing; total ~$10–25k for the full set. After filing, Apache 2.0 applies.

### [2026-05-10] Web-shell: queue pre-handshake emits until first SSE layout, then flush with first cycle id
**Source:** Expedia E2E onboarding test: "apps/demo-expedia/src/main.ts:218 calls searchFlights/Hotels/Activities() synchronously on boot, which dispatches *-search-performed semantic events. These fire before the web-shell's WS opens, so they reach the runtime with cycle=no-cycle. The runtime accepts them gracefully but P-001 binding is silently broken for those three events."
**Category:** capability
**Notes:** Any domain action that fires before the WS handshake completes loses its compose-cycle-id attribution (P-001 invariant broken silently). Fix: the web-shell's WS client should buffer emitted envelopes until it receives the first SSE layout broadcast, then flush the queue stamping each buffered event with that first cycle id. Priority: high — the enterprise onboarding demo triggers this reliably on page load.

### [2026-05-10] `/federate` response should include sub-agent skill list when planner is stub (no LLM)
**Source:** Expedia E2E: "`/federate` returned just `{}` — a real onboarding gap when sub-agent has no LLM planner. An enterprise dev evaluating the platform in CI without an API key would think federation is broken. Suggested fix: include the sub-agent's skill list + descriptor in the response so the parent can fall back to direct dispatch."
**Category:** capability
**Notes:** When the sub-agent's planner is Stub (no `ANTHROPIC_API_KEY`), no invocations fire and the response is `{}`. The parent runtime has no way to distinguish "federation worked but chose to skip skills" from "federation is broken." The `/federate` response envelope should always include at minimum: `{skipped: true, reason: 'stub-planner', availableSkills: [...]}`. This lets the parent runtime fall back to direct `/executor/skill/<name>` dispatch against the sub-agent. Relevant file: `packages/runtime/src/transport/server.ts:482`.

### [2026-05-10] REST API usability: skill execution path aliasing + input-format error messages
**Source:** Expedia E2E: "The correct path is POST /executor/skill/<name> with the input as the body root (no `{input:...}` wrapping). I assumed /skills/<name>/execute (the more conventional REST shape). Most devs will too."
**Category:** capability
**Notes:** Two adjacent DX gaps found: (1) The skill execution endpoint is `/executor/skill/<name>` but the expected REST convention is `/skills/<name>/execute` — add the alias or rename; (2) Skill input goes in the body root, not under `{input:...}` — the error response should include a usage line like `expected JSON body = skill input args; got: …`. Both are in `packages/runtime/src/transport/server.ts:691`. Low-cost fixes with high impact for first-time enterprise integrators.

### [2026-05-10] "Dev mode without API key" story: surface stub mode in `/health` + console warning
**Source:** Expedia E2E: "a new enterprise dev cloning the repo immediately runs node start-runtime.mjs and gets StubComposer + StubPlanner. The agent panel echoes messages but never invokes skills. They'd assume nothing works. The actual story … is: stub mode is for UI / data-plane validation; LLM mode is for orchestration. This needs to be surfaced."
**Category:** capability
**Notes:** When the runtime boots in stub mode (no `ANTHROPIC_API_KEY`), the `/health` response should include `"mode": "stub"` with a human-readable hint (e.g., `"hint": "Set ANTHROPIC_API_KEY to enable LLM planning and composition"`). Additionally, the WS connection handler should log a prominent console warning on first client connect in stub mode. This is the highest-priority onboarding gap found during the Expedia integration test (ranked #5 by enterprise adoption impact). No code-path changes needed — just adding a field to the existing `/health` response schema and one `console.warn` call.
