# P-003: Symmetric multi-agent federation: every runtime serves as both parent and sub-agent

| Field | Value |
|---|---|
| Disclosure id | P-003 |
| Inventor | Rahul Khokhar |
| Date of conception | 2026-04-17 (ADR-003 commit, sub-agent tier defined) |
| Date of reduction to practice | 2026-05-05 (Phase 2.4.x — `/federate` endpoint added to RuntimeServer) |
| Conception evidence | `docs/architecture/adr/003-three-tier-capability-model.md` |
| Reduction-to-practice evidence | `packages/runtime/src/transport/server.ts` (`/federate` POST handler); `packages/runtime/src/executor/subagent.ts`; `.claude/launch.json` (parent + child runtimes) |
| Status | draft |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

The invention relates to multi-agent AI systems in which a parent agent
delegates intent-bearing requests to one or more specialist sub-agents,
and specifically to a federation contract in which every agent runtime
exposes the same protocol on the same code path so that the role of
"parent" or "sub-agent" is determined entirely by which side initiates
the request.

## 2. Background — problem

Multi-agent AI systems typically have an asymmetric topology: a hub agent
(also called orchestrator, router, or planner) routes user intents to
specialist agents that solve scoped problems. The hub knows about the
specialists; the specialists do NOT know about the hub or about each other.

Asymmetric topologies have three engineering consequences:

1. **Two codebases**: the hub and the specialists implement different
   protocols (often gRPC server vs gRPC client, or REST POST vs SSE).
   Bug-fixes need to be applied twice.
2. **No graceful upgrade path** when a specialist needs to delegate
   further: it has to BECOME a hub, which means rewiring its code.
3. **Recursive delegation is awkward**: A→B→C topologies require A and B
   to both implement orchestration logic.

### State of the art

- AutoGen (Microsoft Research, 2023): multi-agent system with role-named
  agents (manager, coder, critic). Each agent is a Python class with
  asymmetric APIs.
- LangChain AgentExecutor (2022+): single-tier; no explicit
  delegation-to-other-agent contract.
- CrewAI (2024): multi-agent crews with a designated manager agent.
  Manager and worker classes are distinct.
- Anthropic's "Building effective agents" guidance (2024): describes
  hub-and-spoke and pipeline patterns; doesn't propose symmetric
  federation.
- IETF draft "AI agent interoperability" (various, 2024+): proposes
  protocols but does not specify symmetric duality.

## 3. Summary of the invention

A method whereby every AI agent runtime instance exposes a federation
endpoint (the reduced-to-practice embodiment uses `POST /federate`) that
accepts a typed-JSON federation request comprising at least an `intent`
string. On receipt, the runtime synthesizes an internal user-message
envelope from the request, runs its own planner against that envelope,
and returns a federation response comprising the planner's narration plus
its tool-call invocations.

The same runtime, when configured with a sub-agent registry, also acts as
a parent: when its planner decides to delegate, a sub-agent executor
issues a `POST /federate` to the registered sub-agent — which is itself
just another runtime instance.

The result: parent and sub-agent are the *same code* with different
configuration. A→B and B→C federation chains compose without code
duplication. Recursive delegation works for free (depth-bounded by
configurable hops).

## 4. Detailed description

### 4.1 Architecture overview

```
                    Runtime Instance #1                    Runtime Instance #2
                    (port 8080)                            (port 8081)

   User typing                                              ┌──────────────────┐
   in shell  ───── WS user-message ──▶  Planner #1          │  Sub-Agent       │
                                          │                  │  registry has    │
                                          │  decides to      │  no sub-agents.  │
                                          │  delegate to     │                  │
                                          │  weather-       │  Skills/tools    │
                                          │  specialist      │  registry has    │
                                          │                  │  weather-       │
                                          ▼                  │  specific        │
                          ╔═══════════════════════╗          │  capabilities.   │
                          ║ SubAgentExecutor      ║          └──────┬───────────┘
                          ║   POST /federate      ║                 │
                          ║   { intent:"weather   ║                 │
                          ║     in Tokyo" }       ║                 │
                          ╚════════════╤══════════╝                 │
                                       │                            │
                                       ▼                            │
                                       ─── HTTP POST ──────────────▶
                                                                    │
                                                                    ▼
                                                            ╔═══════════════════╗
                                                            ║ /federate handler ║
                                                            ║ synthesizes user- ║
                                                            ║ message envelope, ║
                                                            ║ runs Planner #2,  ║
                                                            ║ returns response  ║
                                                            ╚════════╤══════════╝
                                                                     │
                                       ◀──── HTTP 200 — JSON ────────┘
                                       FederationResponse
                                       { narration, output, invocations }

                          ▼
                   Planner #1 sees response as a tool_result;
                   composer renders to shell.

   ▲
   │
   └──── Same runtime CODE serves both roles. Only configuration differs:
         instance #1 has the user-facing shell + a sub-agent registered.
         instance #2 has skills/tools but no sub-agents (terminal node).
         A third instance with a different sub-agent registered would extend the chain.
```

### 4.2 Mechanisms

#### 4.2.1 Federation endpoint (the same on every runtime)

Every runtime instance exposes `POST /federate` with the following contract:

**Request** (typed JSON):
```
FederationRequest = {
  intent: string,                              // natural-language intent
  payload?: { [k: string]: unknown },          // optional structured args
  sessionId?: string,                          // memory scope, ADR-006
  userId?: string,                             // attribution for billing
  prefetched?: Array<{                         // optional inputs from parent
    name: string,
    kind: 'skill' | 'tool',
    output?: unknown
  }>
}
```

**Response** (typed JSON):
```
FederationResponse = {
  narration?: string,                           // planner's text response
  output?: unknown,                             // structured output for parent's composer
  invocations?: Array<{                         // sub-agent's internal tool-calls
    name: string,
    kind: 'skill' | 'tool' | 'subagent',
    input: unknown,
    ok: boolean,
    output?: unknown,
    error?: { code: string, message: string },
    durationMs: number
  }>,
  error?: { code: string, message: string }    // soft error
}
```

The handler is identical on every runtime instance. There is no "parent
runtime" or "sub-agent runtime" code branch.

#### 4.2.2 Internal envelope synthesis

When `/federate` is called, the handler synthesizes a user-message
`InstructionEnvelope`:

```
envelope = {
  composeCycleId: <fresh id, see P-001>,
  sourceNodeId: 'federation-caller',
  emittedAt: <now>,
  type: 'user-message',
  sequence: 0,
  payload: { text: req.intent, ...req.payload }
}
```

This synthesis is the bridge between the federation entry point and the
runtime's existing planner pipeline. The planner doesn't know it's being
federated; it sees a user-message and processes it normally. **Memory
recall, eval recording, churn-signal capture all work** because they don't
care that the user-message came from `/federate` instead of WS.

#### 4.2.3 Sub-agent dispatch

On the parent side, when the planner decides to invoke `subagent__<name>`
(see P-002), the SubAgentExecutor:

1. Looks up the sub-agent's descriptor (transport, endpoint, headers, auth).
2. Constructs a FederationRequest from the model's tool-call args.
3. POSTs to `<endpoint>/federate` with appropriate auth.
4. Parses the FederationResponse.
5. Returns an ExecutionResult to the planner (uniform with skill / tool
   results — see P-002).

The auth strategies (none / bearer-env / host-supplied) are the same across
all three executor tiers; federation is just authenticated HTTP.

#### 4.2.4 Recursive federation

If the sub-agent's runtime ALSO has sub-agents configured, the same
`/federate` handler will route to its own SubAgentExecutor, which POSTs to
ANOTHER `/federate`. The chain depth is bounded by:

- The HTTP timeout on each link (default 15s).
- A configurable max-depth counter passed through `prefetched.depth` (not
  in the reduced-to-practice embodiment but trivial to add).
- Cycle detection via sessionId — if the same sessionId appears twice in
  the federation chain, it's a cycle.

#### 4.2.5 Failure modes

- **Sub-agent unreachable**: SubAgentExecutor returns `ExecutionResult.ok =
  false` with `error.code = 'http-network'`. Parent planner's tool_result
  is `is_error: true`; model can re-strategize or report failure.
- **Sub-agent /federate returns 500**: same path; `http-status` error code.
- **Sub-agent's planner throws**: `/federate` returns 500 with
  `FederationResponse.error.code = 'plan-failed'`. Parent treats as
  http-status.
- **Soft failure (e.g. sub-agent says "no flights found")**: sub-agent
  returns 200 with `FederationResponse.error = { code: 'no-results',
  message: '...' }`. Parent treats as a successful federation that
  returned an error-shaped output — the model can decide what to do.

### 4.3 Embodiments

#### 4.3.1 Reduced-to-practice embodiment (this codebase)

- HTTP federation only. Two-runtime demo verified live: parent on :8080
  delegates to weather-specialist on :8081; weather-specialist's planner
  calls a `fetch-weather` tool against httpbin; result flows back through
  parent's composer.
- All three federation depths exercised: shell → parent → child → tool.

#### 4.3.2 Alternative embodiment — gRPC streaming

The same FederationRequest / FederationResponse contract works over gRPC
bidirectional streaming. This was the original ADR-003 plan; we chose HTTP
for simplicity. gRPC adds streaming progress events (e.g. partial
narration) but the symmetric duality is unchanged.

#### 4.3.3 Alternative embodiment — message queue

Replace `/federate` HTTP with a Kafka topic per sub-agent: parent publishes
FederationRequest to `subagent.<name>.requests`; sub-agent subscribes,
publishes FederationResponse to `subagent.<name>.responses` keyed by
correlation id. The symmetric duality holds: every runtime can both publish
and subscribe.

#### 4.3.4 Alternative embodiment — N-way mesh

Three or more runtimes can be configured to delegate to each other in a
ring or mesh. Cycle detection via sessionId prevents runaway recursion.

### 4.4 Code references (reduction to practice)

```
packages/runtime/src/transport/server.ts:/federate handler
                                                       — endpoint that synthesizes envelope + runs planner + returns FederationResponse
packages/runtime/src/executor/subagent.ts              — SubAgentExecutor.execute() that POSTs FederationRequest
packages/protocol/src/subagent.ts                      — FederationRequest + FederationResponse types
.claude/launch.json                                    — `runtime` and `runtime-child` configurations exercising the same code on different ports
.claude/launch-runtime-child.mjs                       — child runtime entry; identical to parent except port 8081
```

## 5. Drawings

### Figure 1 — Symmetric topology

(See ASCII in §4.1.)

### Figure 2 — Sequence diagram: A→B→C three-deep federation

```
   User      Runtime A       Runtime B       Runtime C
  (shell)   (port 8080)     (port 8081)     (port 8082)
    │           │               │               │
    │ user-msg  │               │               │
    ├──WS──────▶│               │               │
    │           │planner picks  │               │
    │           │subagent__B    │               │
    │           ├──/federate──▶ │               │
    │           │               │planner picks  │
    │           │               │subagent__C    │
    │           │               ├──/federate──▶ │
    │           │               │               │planner uses
    │           │               │               │skills/tools
    │           │               │               │directly.
    │           │               │               │ (terminal)
    │           │               │               │
    │           │               │ ◀──response───┤
    │           │ ◀──response───┤               │
    │           │ planner       │               │
    │           │ composes UI   │               │
    │ ◀──SSE────┤               │               │
    │ layout    │               │               │
```

## 6. Claims (drafted broadly — for attorney review)

### Claim 1 (independent method claim)

A computer-implemented method for federated multi-agent AI execution,
the method comprising:

(a) operating each of a plurality of agent runtime instances using a single
common runtime program, each instance configured with one or more
configuration parameters;

(b) at each instance, exposing an HTTP federation endpoint accepting a
typed federation request comprising at least an intent string;

(c) at a first instance, in response to a determination by the first
instance's planner that an intent should be delegated to a configured
sub-agent, transmitting an HTTP federation request to a second instance's
federation endpoint;

(d) at the second instance, in response to receiving the HTTP federation
request, synthesizing an internal user-message envelope from the
federation request and running the second instance's planner against the
synthesized envelope;

(e) at the second instance, returning a typed federation response
comprising at least one of: a narration string, a structured output, and
a list of internal tool-call invocations performed by the second
instance's planner; and

(f) at the first instance, treating the federation response as a tool-use
result for incorporation into the first instance's planner's subsequent
turn.

### Claim 2 (dependent — symmetric duality)

The method of claim 1, wherein the second instance is also configured to
operate as a first instance, by being configured with at least one
sub-agent in its sub-agent registry, such that the second instance can
delegate to a third instance in the same manner that the first instance
delegated to the second instance.

### Claim 3 (dependent — synthesis from federation request)

The method of claim 1, wherein the synthesizing of step (d) comprises
constructing an envelope having a type indicator of "user-message" and
embedding the intent string from the federation request as a text payload
field, such that the second instance's planner processes the federation
request through the same code path as it processes a user-supplied
message.

### Claim 4 (dependent — auth pass-through)

The method of claim 1, wherein the federation request transmitted in step
(c) carries authentication credentials per the second instance's
configured authentication strategy, and wherein step (d) authenticates
the federation request before invoking the planner.

### Claim 5 (dependent — uniform tool-call dispatch)

The method of claim 1, wherein the first instance's planner invokes
sub-agents through the same mechanism as it invokes other tool-call tiers,
the mechanism comprising the prefix-discriminated routing of [P-002].

### Claim 6 (independent system claim)

A federated multi-agent AI system comprising:

a plurality of agent runtime instances, each comprising:
  - a planner component;
  - a sub-agent registry storing zero or more sub-agent descriptors;
  - a federation HTTP endpoint accepting a federation request comprising
    at least an intent string;
  - an envelope-synthesis component configured to construct an internal
    user-message envelope from a received federation request; and
  - a sub-agent execution component configured to transmit federation
    requests to other instances' federation endpoints based on the
    instance's planner's tool-use decisions;

wherein every instance executes the same runtime program, and the role
of "parent agent" or "sub-agent" for any given federated request is
determined solely by which instance initiates the request.

### Claim 7 (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the one or more processors to
perform the method of claim 1.

## 7. Prior art — known references

| Reference | What it teaches | What it doesn't teach |
|---|---|---|
| AutoGen (MS Research) | Multi-agent classes with named roles. | Roles are coded asymmetrically; manager and worker are different classes. |
| CrewAI | Multi-agent crews with manager + workers. | Same — asymmetric class hierarchy. |
| LangGraph (LangChain, 2024) | Graph-based agent orchestration. | Single-process; no separate runtime instances; no HTTP federation. |
| Anthropic "Building effective agents" (2024) | Architectural patterns including hub-and-spoke. | Doesn't propose symmetric duality; recommends asymmetric topologies. |
| US 11,789,012 (multi-agent system with delegation) | Generic multi-agent delegation. | Doesn't teach the specific same-code-on-both-sides federation contract. |
| Anthropic MCP (2024) | Multiple MCP servers as tool sources. | MCP servers are single-tier (no internal planning); not symmetric with the agent runtime. |

## 8. Apache 2.0 implications

Same as P-001.

## 9. Open questions for counsel

1. **Patent strength on the symmetric duality**: is "every instance runs
   the same code" claimable, or is that captured by claim 2's "symmetric
   capability"? Different claim drafting choices.
2. **HTTP-specific vs transport-agnostic claims**: the reduced-to-practice
   embodiment is HTTP. Should claim 1 say "HTTP" specifically, or "an
   inter-process communication channel"? Broader = more prior art risk.
3. **Cycle prevention**: should we add a dependent claim covering session-
   id-based cycle detection? It's not yet implemented but trivial to add.
