# ADR-001: Self-hosted data plane

**Status:** accepted
**Decision date:** 2026-04-15

## Context

SaaSAgent needs to operate inside enterprises whose customer data is subject to
HIPAA, GDPR, SOC 2, and industry-specific regimes (financial services,
healthcare). A SaaS-style "send your data to our cloud" model would block the
top-of-funnel of design partners we want.

Three deployment shapes were on the table:

1. **Cloud SaaS** — we host the runtime; tenants ship API calls.
2. **Hybrid** — control plane in our cloud, data plane self-hosted.
3. **Fully self-hosted** — every component the tenant runs lives in their VPC.

## Decision

**The data plane is fully self-hosted.** The runtime, planner, composer,
registries, polyglot memory stores, and demo apps all run in the tenant's
infrastructure. We ship Docker images + a `docker-compose.yml` for local /
dev, plus a Helm chart for production Kubernetes.

The control plane (license issuance, telemetry rollups, paid-feature
metering) MAY be SaaS in a future phase, but never on the data path.

## Consequences

**Pro:**
- Removes the top procurement blocker — every Fortune 500 InfoSec review can
  approve in days, not months.
- Tenants own their model API keys (Anthropic / OpenAI / Bedrock) and audit
  logs without us in the loop.
- No multi-tenant isolation is required at the runtime level until a tenant
  decides to host shared instances themselves (Phase 6.3 ships the seam).

**Con:**
- We can't observe usage / errors at the model level — we depend on tenants
  to share logs voluntarily.
- Updates roll out at the tenant's pace. We need stable APIs.

## Implementation

- `Dockerfile` + `docker-compose.yml` at repo root.
- `RuntimeConfig.postgresUrl` / `qdrantUrl` / `kafkaBrokers` / `clickhouseUrl`
  / `neo4jUrl` make every backing store optional + tenant-supplied.
- `docker-compose.yml` defaults all five to local containers for the demo.
