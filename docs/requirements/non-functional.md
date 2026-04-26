# Non-Functional Requirements

> Living document. Cross-cutting properties the platform must hold.

## Categories
- **NFR-PERF\*** — Performance & latency
- **NFR-SCALE\*** — Scalability
- **NFR-SEC\*** — Security & privacy
- **NFR-COMPLIANCE\*** — Regulatory (SOC2, GDPR, HIPAA, …)
- **NFR-RELI\*** — Reliability & availability
- **NFR-OBS\*** — Observability
- **NFR-EXT\*** — Extensibility
- **NFR-DX\*** — Developer experience (host-side dev experience)
- **NFR-COST\*** — Cost / unit economics

## Seed NFRs (to be sharpened)
- **NFR-PERF-001** — First widget render < N ms after user turn (target TBD).
- **NFR-PERF-002** — Streaming token latency comparable to host's existing UX expectations.
- **NFR-SCALE-001** — Multi-tenant by default at the platform layer; single-tenant deployment supported as enterprise tier (TBD).
- **NFR-SEC-001** — Host data never leaves host trust boundary unless host explicitly opts in to platform-side storage.
- **NFR-COMPLIANCE-001** — SOC2 Type II on the platform control plane (target).
- **NFR-RELI-001** — Graceful degradation when a sub-agent / skill / tool / adapter is unavailable.
- **NFR-OBS-001** — Every agentic decision is traceable end-to-end (input → plan → tool calls → widgets → output).
- **NFR-EXT-001** — Adding a new sub-agent / skill / widget / adapter does not require platform-side code changes (registry-driven).
- **NFR-DX-001** — A host domain dev can author a new Feature/Service document and see it live in < 5 minutes.
- **NFR-COST-001** — Per-conversation cost is predictable and can be capped per host tenant.

> All numerical targets are placeholders pending grooming.
