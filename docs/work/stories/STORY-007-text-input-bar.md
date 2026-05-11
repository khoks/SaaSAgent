# STORY-007 — Text input bar in web-shell (Phase 2.0a)

- **Status:** done
- **Created:** 2026-05-05
- **Last updated:** 2026-05-05
- **Parent epic:** [EPIC-010 — Phase 2 Capability execution layer](../epics/EPIC-010-phase-2-capability-execution.md)

## User story
As an end-user of the embedded SaaSAgent shell, I can type a free-text message and submit it so that the planner receives my intent even when the composer renders no interactive buttons.

## Context
Self-review of Phase 1 revealed a critical gap: the shell was button-only. With StubComposer (or HaikuComposer on an empty state), the user had no way to drive conversation forward since no buttons were rendered. A text input bar is the required primary affordance (ADR-039).

## Done when
- `ShellInputBar` component renders in `<saas-agent>` shell.
- Submit fires `user-message` InstructionEnvelope over WebSocket.
- 29 web-shell tests pass including input bar behavior.

## Resolution (2026-05-05)
Shipped as Phase 2.0a. Commit: 68a606e (batched with 2.0b).
