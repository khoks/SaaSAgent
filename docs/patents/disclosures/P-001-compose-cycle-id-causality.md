# P-001: Compose-cycle-id causality token binding server-composed UI to client emits

| Field | Value |
|---|---|
| Disclosure id | P-001 |
| Inventor | Rahul Khokhar |
| Date of conception | 2026-04-16 (ADR-002 commit) |
| Date of reduction to practice | 2026-04-22 (Phase 1.1 — `protocol/src/layout.ts` + `instruction.ts`) |
| Conception evidence | git commit history at `packages/protocol/src/layout.ts` |
| Reduction-to-practice evidence | `packages/protocol/src/layout.ts`; `packages/protocol/src/instruction.ts`; `packages/runtime/src/transport/server.ts` (lines that emit + intercept cycle ids); `packages/web-shell/src/renderer.ts` (echo path) |
| Status | draft |
| Assignee | TBD (Rahul Khokhar pending entity formation) |

## 1. Field of the invention

The invention relates to client-server communication protocols for embedded
AI agent shells in web applications, and specifically to mechanisms that bind
client-side user interactions to the specific server-composed UI artifact that
prompted them.

## 2. Background — problem

Embedded AI agent shells (chat panels, in-page assistants, ambient
copilots) face a causality problem absent from traditional UI frameworks:

- A traditional React/Vue UI is composed once at deploy time. When a user
  clicks a button, the click handler is co-located with the rendering code;
  the framework knows exactly which version of which component fired the
  event.
- An AI agent shell composes UI **dynamically per turn** — the LLM decides
  which buttons to render, what they emit on click, and how the layout
  relates to the conversation history. The user might click a button at
  T=5s that was rendered at T=2s, while the agent has since composed
  *another* layout at T=3s that's already been broadcast.

Three concrete consequences if no causality binding exists:

1. **Telemetry attribution**: when a user clicks "Show me TVs under $800",
   the runtime cannot tell whether that click came from the layout the
   planner produced for intent X or for intent Y, both of which may have
   contained a similar button.
2. **Quality signals (eval / churn ML)**: implicit and explicit feedback on
   a layout (thumbs up/down, dwell time, re-ask) cannot be attributed to
   the specific layout the user was looking at.
3. **Re-compose semantics**: when the runtime re-composes in response to a
   click, the new layout must declare causal continuity ("this is in
   response to your click on the previous layout, which was composed for
   intent X"). Without a stable id flowing through both directions, that
   linkage is lost.

### State of the art

- React framework (Facebook, 2013–): components carry stable keys but the
  "key" is renderer-local and doesn't survive a server-composed re-render.
- Server-Sent Events (W3C, 2009): provides `id:` field for resumption but
  no semantics tying client→server messages back to specific events.
- Anthropic's tool_use API: tool_use blocks have `id` for matching to
  `tool_result`, but this is per-tool-call, not per-rendered-UI.
- HTMX (Khan, 2020+): each server response replaces a fragment of the page;
  no causality token tying subsequent client interactions back.
- Prior open-source AI agent UIs (e.g. Open Interpreter, AutoGPT, AgentGPT):
  no equivalent causality mechanism.

## 3. Summary of the invention

A method whereby a server-side AI runtime issues a unique **compose cycle
id** with every UI artifact ("composed layout") it broadcasts to a client.
The client renders the layout and propagates the cycle id back to the server
in **every subsequent client-emitted event** related to that layout —
including button-click envelopes, text-input messages, ambient DOM-event
relays, and feedback signals. The server uses the cycle id to (a) attribute
each event to the specific layout that prompted it, (b) tag derived
quality-signal envelopes with the same id for downstream eval pipelines,
and (c) make per-cycle re-compose decisions that maintain causal continuity
across the agent ↔ user conversation.

The cycle id is generated server-side at compose time, embedded in the
typed-JSON `ComposedLayout` envelope, surfaced in the `id:` field of the SSE
event, and required to appear in every typed-JSON `InstructionEnvelope` the
client emits over the bidirectional channel.

## 4. Detailed description

### 4.1 Architecture overview

```
┌─────────────────────────┐                  ┌─────────────────────────┐
│       Client / Shell    │                  │     Server / Runtime    │
│                         │                  │                         │
│   ┌───────────────┐     │                  │   ┌─────────────────┐   │
│   │ LayoutRenderer│◀────┼── SSE ───────────┼───│ Composer        │   │
│   │  + cycle-cache│     │ event:layout     │   │  emits cycle-id │   │
│   └───────┬───────┘     │ id:<cycle-id>    │   │  per compose    │   │
│           │             │ data:{cycle...}  │   └─────────────────┘   │
│           │             │                  │           ▲             │
│           ▼             │                  │           │             │
│   ┌──────────────────┐  │                  │   ┌──────────────────┐  │
│   │ EmitTransport    │──┼── WebSocket ────▶│ ─▶│ Per-cycle        │  │
│   │  echoes cycle-id │  │ InstructionEnv │  │   │ envelope         │  │
│   │  in every emit   │  │ {cycle-id:...} │  │   │ correlator       │  │
│   └──────────────────┘  │                  │   └──────────────────┘  │
└─────────────────────────┘                  └─────────────────────────┘
```

### 4.2 Mechanisms

#### 4.2.1 Server-side cycle-id generation

When the runtime invokes its composer to produce a UI layout, it generates a
**unique, opaque, monotonically-orderable** identifier of the form
`<model>-<epoch-ms>-<random-suffix>` (e.g. `claude-haiku-4-5-1778034267052-gs5vlg`).
The id is:

- **Unique within the runtime instance** (epoch ms + random suffix collision
  resistance is sufficient for a single-process runtime).
- **Globally unique with high probability** when the random suffix is at
  least six base36 characters.
- **Sortable** by emit order via the embedded epoch timestamp.
- **Free of personally identifiable information** — model name +
  millisecond timestamp + entropy.

The id is attached to:
- The `ComposedLayout.composeCycleId` field of the typed-JSON envelope.
- The SSE `id:` field of the wire frame, enabling browser auto-resumption
  semantics in addition to causality attribution.

#### 4.2.2 Client-side cycle-id retention + echo

The shell's renderer caches the most recently received cycle id from the SSE
stream. Every client-emitted envelope (over the bidirectional channel —
WebSocket in the reduced-to-practice embodiment) sets the
`InstructionEnvelope.composeCycleId` field to that cached value, including:

- User text messages (typed in an input bar).
- Button-click events from the rendered layout.
- DOM-mutation events from a host-page observer.
- Eval feedback (thumbs up/down).
- Mobile-context updates.
- Custom semantic events (`saasagent:event` CustomEvents).

The renderer updates its cache every time a new cycle id arrives. **A user
interaction with a stale layout still echoes the layout's original cycle id**
— the cache update happens on receipt of a new layout, not on emit.

#### 4.2.3 Server-side per-cycle correlator

On receipt of any client-emitted envelope, the runtime:

1. Reads `envelope.composeCycleId`.
2. Routes the envelope to the correct per-cycle handler:
   - `user-message` → planner with cycle id as context for memory recall.
   - `eval-feedback` → eval store, indexed by cycle id.
   - `dom-mutation` / `dom-visibility` / `dom-semantic` → ambient signal
     buffer attached to the cycle id's session.
   - Action emits → planner with cycle id as the parent of any new compose.
3. When the planner re-composes in response, the **new** compose cycle id
   is generated; the **old** cycle id is preserved as `parentCycleId` in
   the new ComposedLayout's metadata, forming a causal chain.

#### 4.2.4 Failure modes + mitigations

- **Lost SSE connection mid-cycle**: the client's last-known cycle id is
  preserved in memory; on reconnect, the client re-reads the layout
  stream. New layouts get new ids; the EventSource API's auto-resume
  uses the SSE `id:` field independently.
- **Client emits a stale cycle id (e.g. user clicked an old button before
  a new layout arrived)**: the runtime accepts the stale id and dispatches
  per-cycle handling to the layout the user actually saw. This is the
  *desired* behavior — the user saw the old layout; their interaction
  belongs to that layout.
- **Cycle id collision**: cryptographically negligible at the entropy
  level chosen.

### 4.3 Embodiments

#### 4.3.1 Reduced-to-practice embodiment (this codebase)

- Transport: SSE for server→client; WebSocket for client→server.
- Cycle id format: `<model>-<epoch-ms>-<6-char-base36>`.
- Echoed on: user-message, action emits, eval-feedback, dom-*, mobile-context.

#### 4.3.2 Alternative embodiment — single bidirectional WebSocket

The same causality token works on a single-channel WebSocket-only transport.
Server frames carry `cycleId`; client frames echo it. The dual-channel
SSE+WebSocket choice is an independent design decision (ADR-002) that does
not affect the causality token's operation.

#### 4.3.3 Alternative embodiment — opaque token

The cycle id need not encode timestamp + model. An opaque UUIDv4 works
equally well; the only requirements are uniqueness within a runtime instance
and propagation through both directions of the protocol.

#### 4.3.4 Alternative embodiment — multi-runtime federation

When a parent runtime delegates to a sub-agent runtime (P-003), the parent
issues its own cycle id; the sub-agent generates an independent cycle id for
any nested composition; the parent's correlator records both via a
`parentCycleId` chain. This generalizes to N-deep federation.

### 4.4 Code references (reduction to practice)

```
packages/protocol/src/layout.ts                       — ComposedLayout type, composeCycleId field
packages/protocol/src/instruction.ts                  — InstructionEnvelope.composeCycleId field
packages/runtime/src/composer/haiku.ts:wrapLayout     — server-side cycle-id generation
packages/runtime/src/transport/server.ts:broadcastLayout
                                                       — SSE write with id:<cycleId> header
packages/runtime/src/transport/server.ts:handleWsConnection
                                                       — per-cycle envelope routing
packages/web-shell/src/index.ts (lastComposeCycleId)   — client-side cycle cache
packages/web-shell/src/renderer.ts                     — emit envelopes carrying cached cycle id
packages/web-shell/src/input-bar.ts                    — user-message envelope echoes cycle id
packages/web-shell/src/feedback-bar.ts                 — eval-feedback envelope echoes cycle id
packages/web-shell/src/dom-observer.ts                 — dom-* envelopes echo cycle id
```

## 5. Drawings

### Figure 1 — End-to-end cycle-id flow

```
  T=0   Server: composer.compose("welcome") → cycleId=C1
        Server → Client (SSE):
           event: layout
           id:    C1
           data:  { composeCycleId: C1, root: {...} }

  T=2s  Client renders layout C1.
        Client caches lastCycleId = C1.

  T=5s  User types "show me TVs under $800" in the input bar.
        Client → Server (WebSocket):
          { composeCycleId: C1,           ← echo of cached cycle
            type: "user-message",
            payload: { text: "..."} }

  T=5s+ Server's correlator routes the envelope to:
        - planner.plan({ envelope, sessionId, ... })
        - eval-signal recorder (no signal here, but tagged with C1 if any)
        - DOM-signal attribution (any pending signals tag against C1)

  T=7s  Planner finishes; composer.compose("show me TVs...") → cycleId=C2
        ComposedLayout.metadata.parentCycleId = C1
        Server → Client (SSE):
          event: layout
          id:    C2
          data:  { composeCycleId: C2, metadata: { parentCycleId: C1 }, root: ... }

  T=7s+ Client cache updates: lastCycleId = C2.
        Subsequent emits echo C2.
```

### Figure 2 — Per-cycle envelope correlator

```
                  ┌──────────────────────────────────────┐
  WebSocket ─▶── │ envelope.composeCycleId == ?          │
  envelope       └──────────────┬───────────────────────┘
                                │
        ┌───────────────────────┼─────────────────────────────┐
        ▼                       ▼                             ▼
   eval-feedback?           user-message?                  action emit?
   record(signal,           planner.plan({                planner.plan({
     cycleId)                 cycleId,                      cycleId,
                              recall: getMemory(C),        invocation: ...
                              ...})                        })
        │                       │                             │
        └───────────┐           ▼                             ▼
                    │      compose() → cycleId=C'         compose() → cycleId=C''
                    ▼          metadata.parentCycleId=C       metadata.parentCycleId=C
              EvalProvider     broadcast(layout)               broadcast(layout)
              indexed by C
```

## 6. Claims (drafted broadly — for attorney review)

### Claim 1 (independent method claim)

A computer-implemented method comprising:

(a) at a server, generating a UI artifact by invoking a language-model
composer with an intent and a context, the UI artifact comprising a
typed-JSON layout tree describing interactive elements;

(b) generating, at the server, a compose-cycle identifier uniquely
associated with the UI artifact, the compose-cycle identifier comprising at
least an entropy-bearing component;

(c) embedding the compose-cycle identifier into the typed-JSON layout tree;

(d) transmitting the layout tree to a client over a streaming protocol that
also conveys the compose-cycle identifier in a transport-level identifier
field;

(e) at the client, rendering the layout tree and caching the compose-cycle
identifier as a current layout-cycle identifier;

(f) at the client, in response to a user interaction with the rendered
layout, generating an instruction envelope and inserting the cached current
layout-cycle identifier into the instruction envelope; and

(g) transmitting the instruction envelope from the client to the server
over a bidirectional channel,

wherein the server, upon receipt of the instruction envelope, uses the
compose-cycle identifier to associate the instruction envelope with the
corresponding UI artifact for downstream processing.

### Claim 2 (dependent — telemetry attribution)

The method of claim 1, further comprising at the server:

(h) recording at least one quality-signal record indexed by the
compose-cycle identifier, wherein the quality-signal record characterizes
the user's response to the UI artifact identified by the compose-cycle
identifier.

### Claim 3 (dependent — causal chain on re-compose)

The method of claim 1, further comprising at the server:

(h) generating a second UI artifact in response to the instruction envelope,
the second UI artifact comprising a second compose-cycle identifier and a
parent-cycle-identifier field set to the compose-cycle identifier of the
first UI artifact, thereby forming a causal chain between successive UI
artifacts.

### Claim 4 (dependent — multi-channel echo)

The method of claim 1, wherein step (f) comprises echoing the cached
current layout-cycle identifier in instruction envelopes of multiple types,
the multiple types comprising at least two of: a user text-message
envelope, a layout-element activation envelope, an ambient document-event
envelope, and a quality-signal envelope.

### Claim 5 (independent system claim)

A system comprising:

a server runtime configured to:
  - generate a UI artifact as a typed-JSON layout tree by invoking a
    language-model composer;
  - generate, for each generated UI artifact, a compose-cycle identifier;
  - transmit the layout tree and the compose-cycle identifier to a client
    over a streaming protocol; and
  - receive, over a bidirectional channel from the client, instruction
    envelopes that carry the compose-cycle identifier of the layout tree
    that prompted them; and

a client shell, in operative communication with the server runtime,
configured to:
  - render the layout tree;
  - cache the most recently received compose-cycle identifier; and
  - emit instruction envelopes containing the cached compose-cycle
    identifier in response to user interaction with the rendered layout
    tree,

wherein the server runtime uses the compose-cycle identifier carried in
each received instruction envelope to associate the envelope with the UI
artifact that prompted the user interaction.

### Claim 6 (independent computer-readable medium claim)

A non-transitory computer-readable medium storing instructions that, when
executed by one or more processors, cause the one or more processors to
perform the method of claim 1.

## 7. Prior art — known references

| Reference | What it teaches | What it doesn't teach (gap) |
|---|---|---|
| W3C SSE specification (2009) | The `id:` SSE field for stream resumption. | No bidirectional echo of the same id from client back to server in a different channel. |
| React framework (Facebook) | Component keys for reconciler diffing. | Keys are renderer-local; not transmitted to a server; not echoed on user events. |
| Anthropic tool_use API | Per-tool-call `id` for matching `tool_use` to `tool_result`. | Operates within a single model turn; not bound to a rendered UI artifact; not persisted across the LLM's context-window boundaries. |
| HTMX | Server-rendered HTML fragments replace client regions. | No cycle id; no client-emit causality binding. |
| Slack Block Kit | Server-rendered interactive blocks; `action_ts` timestamp on actions. | `action_ts` is per-action, not per-composed-block; no cache-and-echo client retention. |
| LiveView (Phoenix / Rails) | Stateful server-rendered components with bidirectional updates. | Couples state to a single connection; no portable cycle id surviving across compose calls. |
| US 9,471,301 (event causality in distributed systems) | General-purpose event-causality tracking. | Not specific to LLM-composed UI; doesn't encode the dual-channel echo pattern. |

## 8. Apache 2.0 implications

The invention is reduced to practice in code that will be released under
Apache 2.0. Apache 2.0 §3 grants a perpetual, worldwide, royalty-free
patent license to anyone using the licensed code under the license terms.

Filing a provisional patent on this invention does **not** withdraw the §3
grant. It preserves:

- The right to license the patent to third parties on different terms (e.g.
  a paid commercial license tier of the open-core model).
- The right to defend against patent attacks: if a third party were to
  assert a related patent against SaaSAgent users, this patent would be
  available as a counterclaim.

## 9. Open questions for counsel

1. **Claim breadth on the client-cache mechanism**: should claim 1 require
   the client to MAINTAIN a cache of the cycle id, or merely to ECHO the id
   if available? The latter is broader; the former is more defensible.
2. **System claim vs method claim emphasis**: USPTO examiners sometimes
   reject system claims as functional language; method claims are usually
   stronger.
3. **Anthropic-specific aspects**: should "language-model composer" be
   replaced with broader "AI-driven layout generator"? More general =
   broader claim but more prior art to overcome.
4. **Should we file a CIP after the OSS publish to capture the version with
   ambient DOM-signal echo (P-009 candidate)?**
