# ADR-010: Auth strategy — pluggable provider, Bearer + JWT defaults

**Status:** accepted
**Decision date:** 2026-05-06

## Context

The runtime exposes REST endpoints and a WebSocket. Both need an auth gate
in production. Options considered:

1. **mTLS only** — strong, but every HTTP client needs cert provisioning.
   Operationally heavy.
2. **Single shared bearer token** — simple, but no per-user attribution
   and rotation is awkward.
3. **JWT** — per-user attribution, standard expiry, library support
   everywhere.
4. **OAuth / OIDC** — enterprise-grade but adds an IdP dependency.

A single choice doesn't fit all tenants — some are mTLS-only by policy,
others want JWTs with their own IdP, others just want a quick shared
secret for dev.

## Decision

**A pluggable `AuthProvider` interface with three default implementations:**

- `NoAuthProvider` — accepts everything; tests / single-user dev.
- `BearerTokenAuthProvider` — single shared secret, constant-time compare,
  matches the Phase 2.7 inline check exactly.
- `JWTAuthProvider` — verifies HS256/RS256 JWTs with optional audience +
  issuer + clock-skew checks. Maps standard claims (`sub`, `tenant`) to
  `AuthPrincipal { id, tenantId, claims }`.

Hosts that need OIDC / mTLS implement their own provider against the same
interface. The runtime calls `authenticate(input)` once per HTTP request
and once per WS upgrade — providers can short-circuit `/health` if
desired.

**Tenancy is part of the principal.** When `JWTAuthProvider` extracts
`claims.tenant`, that propagates through to the multi-tenant registries
(see Phase 6.3 `MultiTenantSkillRegistry` etc).

## Consequences

**Pro:**
- Single seam, multiple implementations.
- Per-request principals (not just connection-time auth) compose with
  rate-limiting and audit logging.
- Custom providers can wrap any IdP without runtime changes.

**Con:**
- JWT verification adds ~1ms per request. Acceptable.
- Hosts must keep their JWT signing key out of source — we document the
  ANTHROPIC_API_KEY pattern (machine-scope env var) for both keys.

## Implementation

- `packages/runtime/src/auth/types.ts` — interface + NoAuthProvider.
- `packages/runtime/src/auth/bearer.ts` — BearerTokenAuthProvider.
- `packages/runtime/src/auth/jwt.ts` — JWTAuthProvider (HS256/RS256 via
  node:crypto, no dep on jsonwebtoken).
