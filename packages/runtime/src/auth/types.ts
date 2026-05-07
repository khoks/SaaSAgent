/**
 * AuthProvider — Phase 6 (Bucket C.1).
 *
 * Pluggable auth gate for REST + WS. Replaces the single-token check from
 * Phase 2.7 with a provider abstraction so hosts can wire JWT / OIDC /
 * mTLS / their own scheme behind one stable seam.
 *
 * The provider answers `authenticate(input)` returning either:
 *   { ok: true, principal: { id, ...claims } } — request is authenticated
 *   { ok: false, reason: string }              — reject with 401 + reason
 *
 * Implementations:
 *   • NoAuthProvider           — accepts everything; unauthenticated mode (default).
 *   • BearerTokenAuthProvider  — single shared secret; matches Phase 2.7 behavior.
 *   • JWTAuthProvider          — verify HS256/RS256 JWTs; principal carries claims.
 *
 * The runtime calls `authenticate()` once per HTTP request (non-/health) and
 * once per WS upgrade. WS connections that fail upgrade-time auth are dropped;
 * REST requests get 401 with `WWW-Authenticate: Bearer realm="saasagent"`.
 */

export interface AuthInput {
  /** Authorization header value, when present. */
  authorization?: string;
  /** Query-string token for WS connections (browsers can't set headers on `new WebSocket(...)`). */
  queryToken?: string;
  /** Remote IP for logging / rate-limit attribution. */
  remoteAddress?: string;
}

/** Authenticated principal. Free-form claim bag plus a stable id. */
export interface AuthPrincipal {
  /** Stable user/service identifier (e.g. `user-42`, `svc-billing`). */
  id: string;
  /** Optional tenant id (used by multi-tenant runtime in C.3). */
  tenantId?: string;
  /** Free-form additional claims (scopes, role, expiry, etc). */
  claims?: Readonly<Record<string, unknown>>;
}

export type AuthResult =
  | { ok: true; principal: AuthPrincipal }
  | { ok: false; reason: string };

export interface AuthProvider {
  readonly name: string;
  authenticate(input: AuthInput): Promise<AuthResult> | AuthResult;
}

/** Always-allow provider — equivalent to no auth gate. Tests + dev default. */
export class NoAuthProvider implements AuthProvider {
  readonly name = 'none';
  authenticate(): AuthResult {
    return { ok: true, principal: { id: 'anonymous' } };
  }
}
