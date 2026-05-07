# STORY-010 — Sub-Agent SDK defineSubAgent

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As a partner developer, I want a TypeScript SDK function `defineSubAgent({ name, skills, tools, features })` that returns a `SubAgentApp` with `start()`, `stop()`, and `registerWith(hostUrl)` methods, so that I can author and self-register a sub-agent in under 20 lines of code.

## Context

ADR-021 specified the Sub-Agent SDK design. The Phase 0 `sdk-ts` package had a stub. This story replaces it with the real `defineSubAgent` implementation, completing the developer-facing interface for the agent federation model.

## Done when

- `sdk-ts/src/index.ts` exports `defineSubAgent` returning a fully typed `SubAgentApp`.
- `SubAgentApp.start()` boots a local HTTP server exposing skill/tool endpoints.
- `SubAgentApp.registerWith(hostUrl)` POSTs self-registration to the runtime.
- 5 SDK tests added and passing.
