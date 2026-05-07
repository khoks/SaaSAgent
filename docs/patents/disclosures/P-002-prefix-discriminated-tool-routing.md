# P-002: Prefix-discriminated three-tier capability routing for LLM tool-use APIs

| Field | Value |
|---|---|
| Disclosure id | P-002 |
| Inventor | Rahul Khokhar |
| Date of conception | 2026-04-17 (ADR-003 commit) |
| Date of reduction to practice | 2026-05-04 (Phase 2.4 — `planner/tool-mapper.ts` with subagent__ prefix) |
| Conception evidence | `docs/architecture/adr/003-three-tier-capability-model.md` |
| Reduction-to-practice evidence | `packages/runtime/src/planner/tool-mapper.ts`; `packages/runtime/src/planner/sonnet.ts` (dispatch); `packages/runtime/src/executor/{skill,tool,subagent}.ts` |
| Status | draft |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

The invention relates to AI agent runtimes that invoke external capabilities
(API calls, in-process functions, federated sub-agents) via large language
model tool-use APIs, and specifically to a routing mechanism that exposes
multiple distinct execution tiers to the language model through a single
unified interface while preserving the runtime's ability to dispatch each
invocation to the correct execution backend.

## 2. Background — problem

Modern LLM tool-use APIs (Anthropic's `tool_use`, OpenAI's `function_calling`,
Google's `tool` field on Gemini) accept a flat list of tool definitions. The
model picks one or more, generates structured arguments, and the runtime is
responsible for actually invoking whatever the tool name refers to.

Real production agents need to invoke capabilities at three architecturally
distinct tiers:

- **In-process functions** ("skills") — JavaScript/Python/Go functions
  registered at runtime startup. Microsecond latency. Trusted code.
- **HTTP API calls** ("tools") — stateless requests to external services.
  Tens-to-hundreds of milliseconds. Authenticated via headers / OAuth.
- **Federated sub-agents** — separate runtime processes that own their own
  planner, registries, and state. Hundreds of ms to seconds. Each sub-agent
  is itself an AI agent that may make its own tool calls.

These tiers have different cost / latency / failure-mode profiles, but the
LLM tool-use API gives the model a flat list. Three engineering options
exist:

1. **Hide tiers from the model**: surface every capability as an opaque
   tool. The runtime decides at dispatch time. The model has no signal
   about cost / latency, so it routes badly (calls a slow sub-agent for a
   fast lookup).
2. **Surface multiple tool lists**: most LLM APIs don't support this.
3. **Use separate prompt-injected hints**: brittle; the model often
   ignores them.

### State of the art

- LangChain (2022+): "AgentExecutor" wraps a flat tool list. No explicit
  multi-tier architecture; the user's tool definitions implicitly include
  one tier.
- AutoGen (Microsoft Research, 2023): multi-agent framework with separate
  agents per role, but uses message-passing between agents rather than
  tool-call delegation through one model's tool API.
- OpenAI Assistants API (2023): function_calling + Code Interpreter +
  Retrieval as separate "tools" but the discrimination is hard-coded into
  the OpenAI server, not extensible by the developer.
- Google's Gemini function-calling: similar to OpenAI; tools are flat.
- ToolLLM / Toolformer / various academic papers (2023–): tool-use research
  focuses on tool discovery and selection, not multi-tier dispatch.

None of the cited prior art teaches a developer-extensible mechanism for
exposing multiple architecturally-distinct execution tiers through a single
LLM tool-use API such that the model can reason about tier selection.

## 3. Summary of the invention

A method whereby a runtime registers capabilities at N distinct execution
tiers (in the reduced-to-practice embodiment, three: in-process functions,
HTTP tools, and federated sub-agents) and exposes them all to a language
model through the model's standard tool-use API by **prefixing each tool
name with a stable, parseable tier discriminator** (e.g., `skill__<name>`,
`tool__<name>`, `subagent__<name>`). The model, presented with a flat list
of tools, sees the prefix as part of the tool name and the runtime, on
receipt of a tool-use call, parses the prefix to dispatch the call to the
correct tier-specific executor.

The descriptors for each tier carry **tier-aware `whenToUse` guidance**
that documents cost / latency / failure mode, encouraging the model to
prefer cheap tiers for simple lookups and reserve heavy tiers for
problems that require them.

The mechanism is composable: additional tiers (e.g., `mcp__` for
Model-Context-Protocol servers, `db__` for direct database queries) can be
added by registering a fourth prefix; the dispatch table is data, not code.

## 4. Detailed description

### 4.1 Architecture overview

```
                     Capabilities Registries
                  ┌──────────┬──────────┬───────────┐
                  │  Skills  │   Tools  │ Sub-agents│
                  └────┬─────┴────┬─────┴─────┬─────┘
                       ▼          ▼           ▼
                ╔══════════════════════════════════╗
                ║   tool-mapper.descriptorsToTools ║
                ║                                  ║
                ║   skill[*].name → "skill__"     ║
                ║   tool[*].name  → "tool__"       ║
                ║   subA[*].name  → "subagent__"   ║
                ╚════════════════╤═════════════════╝
                                 ▼
                        ToolDefinition[]
                                 ▼
                ┌──────────────────────────────────┐
                │       LLM tool-use API call      │
                │  (Anthropic / OpenAI / Gemini)   │
                └──────────────┬───────────────────┘
                               ▼
                       Model emits tool_use:
                          name: "tool__get-weather"
                          input: { city: "Tokyo" }
                               │
                               ▼
                ╔══════════════════════════════════╗
                ║       parseToolName(name)        ║
                ║                                  ║
                ║   "tool__get-weather"            ║
                ║      → { kind:'tool', name:    } ║
                ║         'get-weather' }          ║
                ╚════════════════╤═════════════════╝
                                 ▼
        ┌────────────────┬───────────────────┬──────────────────┐
        ▼                ▼                   ▼                  ▼
  SkillExecutor    ToolExecutor       SubAgentExecutor    (extensible)
  (in-process)     (HTTP fetch)       (federation POST)
```

### 4.2 Mechanisms

#### 4.2.1 Tier-tagged registration

The runtime maintains separate registries per tier. Each registry stores
descriptors of the same shape (`name`, `version`, `description`,
`whenToUse`, `inputSchema?`) but the tier is implicit in which registry the
descriptor lives in. The descriptor's `name` is a stable kebab-case
identifier within the tier (e.g., `get-weather` in the tools registry).

Tier-aware `whenToUse` text is the key to model behavior — the developer
writes things like "**Always** use this skill for in-process calculations
under 5ms; **never** for external API calls" or "use this sub-agent only
when the user explicitly asks about travel booking; defer to skills for
weather lookups."

#### 4.2.2 Prefix-aware tool definition emission

A `tool-mapper` function flattens all per-tier registries into a single
`ToolDefinition[]` for the LLM. Each tool gets:

- **Name**: `<prefix><descriptor.name>`, where `<prefix>` is a stable
  string per tier. The reduced-to-practice embodiment uses `skill__` /
  `tool__` / `subagent__`.
- **Description**: `${descriptor.description}\n\nWhen to use: ${descriptor.whenToUse}`
  — both sentences in one description so the model sees both the
  one-liner and the multi-sentence guidance the way it's been trained
  to read tool descriptions.
- **input_schema**: the descriptor's `inputSchema` if defined, else a
  permissive `{ type: 'object', properties: {} }`.

For sub-agents (which run a complete agent runtime themselves), the
input schema is fixed at `{ intent: string, payload?: object }`
regardless of any sub-agent-internal schema — the sub-agent owns its
own validation. This presents the parent model with a uniform sub-agent
interface.

The prefix character sequence `__` (double underscore) is chosen
specifically because:
- It matches Anthropic's tool-name regex `^[a-zA-Z0-9_-]{1,64}$`.
- It is unlikely to appear in capability names by accident.
- It is parseable by simple `startsWith()` without ambiguity.

#### 4.2.3 Prefix-aware dispatch

When the model emits a `tool_use` content block, the runtime calls
`parseToolName(qualifiedName)`:

```
function parseToolName(qualified):
  if qualified.startsWith("subagent__"):
    return { kind: 'subagent', name: qualified.slice(10) }
  if qualified.startsWith("skill__"):
    return { kind: 'skill',    name: qualified.slice(7) }
  if qualified.startsWith("tool__"):
    return { kind: 'tool',     name: qualified.slice(6) }
  return null
```

The dispatch is then a switch:
- `kind: 'skill'` → `skillExecutor.execute(name, input)`
- `kind: 'tool'` → `toolExecutor.execute(name, input)` (HTTP fetch)
- `kind: 'subagent'` → `subAgentExecutor.execute(name, { intent, payload })`
   (federation POST)

Each executor produces a uniform `ExecutionResult` discriminated union
that the runtime serializes as a `tool_result` content block back to the
model.

#### 4.2.4 Failure modes

- **Unknown prefix**: returns an `is_error: true` `tool_result` to the
  model with content "unknown tool prefix"; the model can re-strategize.
- **Prefix collision** (developer registers `skill__price-compare` AND
  `tool__price-compare`): the registries are separate so this is allowed.
  The model sees both with their respective `whenToUse` guidance.
- **Missing executor for a tier**: the tier-mapper omits descriptors of a
  tier whose executor isn't configured; the model never sees them.

### 4.3 Embodiments

#### 4.3.1 Reduced-to-practice embodiment (this codebase)

Three tiers: `skill__`, `tool__`, `subagent__`. Anthropic Claude tool-use
API. Sub-agents communicate via HTTP federation (see P-003).

#### 4.3.2 Alternative embodiment — N-tier extension

The mechanism generalizes to N tiers by registering additional prefix
strings. Examples:
- `mcp__<server>__<tool>` for Model-Context-Protocol servers (Anthropic,
  2024) — the prefix encodes BOTH the tier AND the server origin.
- `db__<table>` for direct database query capabilities.
- `cache__<region>` for distributed cache access.

The dispatch table grows linearly; the model's contract is unchanged.

#### 4.3.3 Alternative embodiment — non-prefix discriminator

The prefix `__` is one of several possible name-encoded discriminators.
Equivalent embodiments:
- Suffix: `<name>__skill`.
- Bracketed: `[skill]<name>`.
- JSON-like: `{ "skill": "<name>" }` if the LLM tool-name field accepts
  JSON.
- Separate descriptor field outside the name (NOT name-encoded): requires
  custom tooling outside the standard tool-use API and breaks
  vendor-portability — a NEGATIVE alternative offered for completeness;
  the inventor specifically chose name-encoded prefixes for portability.

#### 4.3.4 Alternative embodiment — vendor portability

The same prefixing mechanism works on any LLM tool-use API:
- OpenAI `function_calling`: the function name field accepts
  `[a-zA-Z0-9_-]+`; `skill__price-compare` parses correctly.
- Google Gemini `tools.function_declarations`: same character set.
- Bedrock-hosted models: passes through to the underlying model.

### 4.4 Code references (reduction to practice)

```
packages/runtime/src/planner/tool-mapper.ts:1-end       — descriptorsToTools, qualifyToolName, parseToolName, prefix constants
packages/runtime/src/planner/tool-mapper.test.ts        — 10 tests covering round-trip, ordering, schema fallback
packages/runtime/src/planner/sonnet.ts:dispatchToolUse   — prefix-aware dispatch
packages/runtime/src/executor/skill.ts                  — SkillExecutor for skill__ prefix
packages/runtime/src/executor/tool.ts                   — ToolExecutor for tool__ prefix
packages/runtime/src/executor/subagent.ts               — SubAgentExecutor for subagent__ prefix
packages/runtime/src/executor/types.ts                  — uniform ExecutionResult discriminated union
packages/protocol/src/skill.ts                          — SkillDescriptor schema
packages/protocol/src/tool.ts                           — ToolDescriptor schema
packages/protocol/src/subagent.ts                       — SubAgentDescriptor schema
```

## 5. Drawings

### Figure 1 — Three-tier registration → flat tool list → dispatch

(See ASCII diagram in §4.1.)

### Figure 2 — Sequence diagram: model picks a tier

```
  User: "What's the weather in Tokyo and how does it compare to last week?"

  ┌────────┐      ┌──────────┐    ┌──────────┐      ┌────────────┐
  │Planner │      │  Model   │    │Tool      │      │  Skill     │
  │        │      │(Anthropic)│    │Executor  │      │  Executor  │
  └────┬───┘      └────┬─────┘    └────┬─────┘      └────┬───────┘
       │tools:         │               │                 │
       │ [skill__compare-temp,         │                 │
       │  tool__get-weather,           │                 │
       │  subagent__weather-bureau]    │                 │
       │ + intent: "..."               │                 │
       │              │               │                 │
       │─────────────▶│               │                 │
       │              │ tool_use:     │                 │
       │              │  tool__get-   │                 │
       │              │  weather      │                 │
       │◀─────────────│               │                 │
       │              │               │                 │
       │parseToolName(): kind=tool, name=get-weather    │
       │              │               │                 │
       │─────────────────────────────▶│                 │
       │              │               │HTTP fetch       │
       │              │               │  (Tokyo)        │
       │◀─────────────────────────────│                 │
       │              │               │                 │
       │tool_result   │               │                 │
       │─────────────▶│               │                 │
       │              │ tool_use:     │                 │
       │              │  skill__      │                 │
       │              │  compare-temp │                 │
       │              │  args: {now,  │                 │
       │              │   lastWeek}   │                 │
       │              │               │                 │
       │parseToolName(): kind=skill, name=compare-temp  │
       │              │               │                 │
       │───────────────────────────────────────────────▶│
       │              │               │   in-process    │
       │              │               │      call       │
       │◀───────────────────────────────────────────────│
       │              │               │                 │
       │tool_result   │               │                 │
       │─────────────▶│               │                 │
       │              │ end_turn:     │                 │
       │              │ "Tokyo is     │                 │
       │              │  3°C cooler"  │                 │
       │◀─────────────│               │                 │
```

## 6. Claims (drafted broadly — for attorney review)

### Claim 1 (independent method claim)

A computer-implemented method for routing capability invocations from a
language model to multiple distinct execution tiers, the method comprising:

(a) maintaining, at a runtime, a plurality of capability registries, each
registry corresponding to a distinct execution tier of the runtime, each
registry storing capability descriptors comprising at least a tier-internal
name and a usage guidance string;

(b) generating, for invocation by the language model, a unified list of
tool definitions, each tool definition comprising a name field set to the
concatenation of (i) a stable tier-discriminator prefix associated with the
execution tier and (ii) the tier-internal name from the descriptor;

(c) submitting the unified list of tool definitions to the language model
as part of a tool-use request;

(d) receiving from the language model a tool-use response comprising a
qualified tool name;

(e) parsing the qualified tool name to extract the tier-discriminator
prefix and the tier-internal name; and

(f) dispatching, based on the extracted tier-discriminator prefix, the
tool-use response to a tier-specific executor associated with the
identified execution tier.

### Claim 2 (dependent — three specific tiers)

The method of claim 1, wherein the plurality of execution tiers comprises:

- a first tier of in-process function capabilities executable within the
  same process as the runtime;
- a second tier of stateless network-API capabilities executable by HTTP
  request to an external service; and
- a third tier of federated sub-agent capabilities executable by submitting
  a federation request to a separate AI-agent runtime instance.

### Claim 3 (dependent — uniform ExecutionResult)

The method of claim 1, further comprising:

(g) at each tier-specific executor, producing an execution result conforming
to a tier-independent discriminated union schema; and

(h) serializing the execution result as a tool-result content block for
return to the language model in the next tool-use turn.

### Claim 4 (dependent — uniform sub-agent input schema)

The method of claim 2, wherein the tool definitions for the third tier
of federated sub-agent capabilities specify a uniform input schema
comprising at least a `intent` string field, irrespective of the
sub-agent's internal input schema, such that the language model is
presented with a consistent interface for invoking sub-agents at the
third tier.

### Claim 5 (dependent — descriptor description format)

The method of claim 1, wherein each tool definition's description field
combines the descriptor's one-line description with a "When to use" prefix
followed by the descriptor's usage guidance, presenting the language model
with both summary and detailed selection guidance.

### Claim 6 (independent system claim)

A system comprising:

a plurality of capability registries, each associated with a distinct
execution tier;

a tool-mapping component configured to flatten the plurality of capability
registries into a unified tool-definition list, each tool definition having
a name comprising a tier-discriminator prefix and a tier-internal name;

a language-model interface configured to submit the unified
tool-definition list to a language model and receive tool-use responses
therefrom;

a parsing component configured to extract a tier-discriminator prefix and a
tier-internal name from a tool-use response's qualified tool name;

a plurality of tier-specific executors, each associated with one of the
execution tiers; and

a dispatch component configured to route a parsed tool-use response to the
tier-specific executor associated with the extracted tier-discriminator
prefix.

### Claim 7 (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the one or more processors to
perform the method of claim 1.

## 7. Prior art — known references

| Reference | What it teaches | What it doesn't teach |
|---|---|---|
| Anthropic tool_use API documentation | Single flat tool list with `name` + `description` + `input_schema`. | Doesn't discuss multi-tier dispatch encoded in the name. |
| OpenAI function_calling | Same. | Same. |
| LangChain AgentExecutor | Tool registration + LLM-driven selection. | Single tier; no explicit cost/latency tier discrimination. |
| AutoGen (MS Research) | Multi-agent frameworks with role-named agents. | Uses message-passing between agents, not tool-call dispatch through a single model's tool API. |
| Anthropic MCP (Model Context Protocol, 2024) | Multiple "MCP servers" as tool sources, named with `<server>:<tool>`. | Single tier (all MCP); doesn't discriminate between in-process / HTTP / federated tiers within a single agent runtime. |
| US 11,544,572 (LangChain-style tool-routing) | Generic tool-routing in LLM agents. | Doesn't teach prefix-encoded tier discrimination. |

## 8. Apache 2.0 implications

Same as P-001 — Apache 2.0 §3 grants apply; provisional filing preserves
commercial-license + defensive-counterclaim rights.

## 9. Open questions for counsel

1. **Should the tiers be enumerated in claim 1 or left abstract?** Claim 1
   currently leaves the tier set abstract; claim 2 enumerates the specific
   three. Strategic question whether to defend "any tier discrimination" or
   "skills + tools + sub-agents specifically."
2. **MCP-style tier-AND-source discriminators**: would a continuation
   covering the `mcp__<server>__<tool>` pattern (P-002a) be worthwhile?
3. **Vendor-portability claim**: is there a separate claim worth filing on
   the portability of this technique across LLM providers?
