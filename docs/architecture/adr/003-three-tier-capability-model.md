# ADR-003: Three-tier capability model — Skills, Tools, Sub-Agents

**Status:** accepted
**Decision date:** 2026-04-17

## Context

The agent needs a way to "do things" in the host's domain. Anthropic's
tool_use API gives us a uniform invocation interface, but a flat list of
tools doesn't capture three meaningfully different operating points:

- **Cheap & fast** stateless capabilities (call an API, do math).
- **Mid-cost** in-process logic (a typed function the host already wrote).
- **Heavy** capabilities that need their own runtime, planner, and state
  (a "travel-specialist" agent owned by a different team).

A single tier conflates these and pushes the planner toward unwise choices
(e.g., delegating a 10ms cart-summary lookup to a 200ms federated sub-agent).

## Decision

**Three explicit tiers, each with its own descriptor + executor:**

| Tier | What | Runs | Latency |
|---|---|---|---|
| **Tools** | Stateless HTTP calls | Any URL | network (10ms–1s) |
| **Skills** | In-process JS/TS functions | Same Node process | sub-millisecond |
| **Sub-Agents** | Federated runtimes | Separate process / service | 100ms–10s |

The planner sees all three as Anthropic tool definitions, prefixed
(`skill__<name>`, `tool__<name>`, `subagent__<name>`) so dispatch is
unambiguous. Each tier has its own `XExecutor` that handles invocation
mechanics (HTTP fetch, function call, federation POST).

## Consequences

**Pro:**
- Domain teams can own a sub-agent independently — it's a separate service
  with its own deploy cadence + ownership.
- The planner picks the right tier based on the descriptor's `whenToUse`,
  which carries cost/latency hints.
- Sub-agents are themselves runtimes — federation is symmetric (any runtime
  can be a sub-agent of another, see ADR-002 + the `/federate` endpoint).

**Con:**
- Three implementations to keep in sync. Mitigated by the shared
  `ExecutionResult` discriminated union.
- The planner needs hints in the descriptor to pick correctly. We rely on
  `whenToUse` quality.

## Implementation

- `packages/protocol/src/skill.ts` + `tool.ts` + `subagent.ts`
- `packages/runtime/src/executor/skill.ts` / `tool.ts` / `subagent.ts`
- `packages/runtime/src/planner/tool-mapper.ts` — single function flattens
  all three registries into one `ToolDefinition[]` for the model.
