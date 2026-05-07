/**
 * JWTAuthProvider — Phase 6 (Bucket C.1).
 *
 * Verify JWTs (HS256 / RS256) and turn claims into an AuthPrincipal. Uses
 * Node's built-in node:crypto — no jsonwebtoken dep. Supports:
 *
 *   alg: 'HS256'   — shared secret HMAC
 *   alg: 'RS256'   — RSA public-key verification (host provides PEM)
 *
 * The principal id is derived from `claims.sub` (standard JWT) or `claims.id`
 * (host convention). Tenant id from `claims.tenant` or `claims.tenant_id`.
 * Standard registered claims (`exp`, `nbf`, `iss`, `aud`) are validated when
 * present; unknown claims pass through to `principal.claims`.
 *
 * Audience + issuer checks are optional — pass `expectedAudience`/`expectedIssuer`
 * to enforce. Clock skew tolerance: 30 seconds.
 */

import { createHmac, createVerify, timingSafeEqual } from 'node:crypto';

import type { AuthInput, AuthPrincipal, AuthProvider, AuthResult } from './types.js';

export type JWTAlgorithm = 'HS256' | 'RS256';

export interface JWTAuthProviderOptions {
  /** HS256: shared secret. RS256: PEM-encoded public key. */
  key: string;
  /** Algorithm to require — verifier rejects tokens with a different alg. Default 'HS256'. */
  algorithm?: JWTAlgorithm;
  /** Optional audience (`aud`) check. */
  expectedAudience?: string;
  /** Optional issuer (`iss`) check. */
  expectedIssuer?: string;
  /** Clock skew tolerance in seconds. Default 30. */
  clockToleranceSec?: number;
  /** Override the time source (tests). */
  now?: () => number;
}

interface JWTHeader {
  alg: string;
  typ?: string;
  kid?: string;
}

interface JWTPayload {
  sub?: string;
  id?: string;
  tenant?: string;
  tenant_id?: string;
  iat?: number;
  exp?: number;
  nbf?: number;
  iss?: string;
  aud?: string | string[];
  [k: string]: unknown;
}

export class JWTAuthProvider implements AuthProvider {
  readonly name = 'jwt';
  private readonly key: string;
  private readonly algorithm: JWTAlgorithm;
  private readonly expectedAudience: string | undefined;
  private readonly expectedIssuer: string | undefined;
  private readonly clockToleranceSec: number;
  private readonly now: () => number;

  constructor(opts: JWTAuthProviderOptions) {
    this.key = opts.key;
    this.algorithm = opts.algorithm ?? 'HS256';
    if (opts.expectedAudience !== undefined) this.expectedAudience = opts.expectedAudience;
    if (opts.expectedIssuer !== undefined) this.expectedIssuer = opts.expectedIssuer;
    this.clockToleranceSec = opts.clockToleranceSec ?? 30;
    this.now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  }

  authenticate(input: AuthInput): AuthResult {
    const raw = parseBearer(input.authorization) ?? input.queryToken ?? null;
    if (!raw) return { ok: false, reason: 'missing-credential' };
    const parts = raw.split('.');
    if (parts.length !== 3) return { ok: false, reason: 'malformed-jwt' };

    let header: JWTHeader;
    let payload: JWTPayload;
    try {
      header = JSON.parse(b64UrlDecode(parts[0]!)) as JWTHeader;
      payload = JSON.parse(b64UrlDecode(parts[1]!)) as JWTPayload;
    } catch {
      return { ok: false, reason: 'malformed-jwt' };
    }
    if (header.alg !== this.algorithm) {
      return { ok: false, reason: `algorithm-mismatch: expected ${this.algorithm}, got ${header.alg}` };
    }

    const signingInput = `${parts[0]}.${parts[1]}`;
    const signature = parts[2]!;

    if (this.algorithm === 'HS256') {
      const expected = createHmac('sha256', this.key).update(signingInput).digest();
      const actual = b64UrlDecodeBuffer(signature);
      if (expected.length !== actual.length) return { ok: false, reason: 'bad-signature' };
      if (!timingSafeEqual(expected, actual)) return { ok: false, reason: 'bad-signature' };
    } else {
      // RS256
      const verifier = createVerify('RSA-SHA256');
      verifier.update(signingInput);
      verifier.end();
      const sig = b64UrlDecodeBuffer(signature);
      let ok: boolean;
      try {
        ok = verifier.verify(this.key, sig);
      } catch {
        ok = false;
      }
      if (!ok) return { ok: false, reason: 'bad-signature' };
    }

    // Standard registered claim checks.
    const now = this.now();
    if (typeof payload.exp === 'number' && now > payload.exp + this.clockToleranceSec) {
      return { ok: false, reason: 'token-expired' };
    }
    if (typeof payload.nbf === 'number' && now + this.clockToleranceSec < payload.nbf) {
      return { ok: false, reason: 'token-not-yet-valid' };
    }
    if (this.expectedAudience !== undefined) {
      const aud = payload.aud;
      const matches =
        aud === this.expectedAudience ||
        (Array.isArray(aud) && aud.includes(this.expectedAudience));
      if (!matches) return { ok: false, reason: 'audience-mismatch' };
    }
    if (this.expectedIssuer !== undefined && payload.iss !== this.expectedIssuer) {
      return { ok: false, reason: 'issuer-mismatch' };
    }

    const id = (typeof payload.sub === 'string' && payload.sub) ||
      (typeof payload.id === 'string' && payload.id) ||
      'jwt-anonymous';
    const principal: AuthPrincipal = { id };
    const tenantId =
      (typeof payload.tenant === 'string' && payload.tenant) ||
      (typeof payload.tenant_id === 'string' && payload.tenant_id) ||
      undefined;
    if (tenantId) principal.tenantId = tenantId;
    // Stash the rest as claims (excluding the ones we already pulled out).
    const claims: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload)) {
      if (k === 'sub' || k === 'id' || k === 'tenant' || k === 'tenant_id') continue;
      claims[k] = v;
    }
    if (Object.keys(claims).length > 0) principal.claims = claims;
    return { ok: true, principal };
  }
}

function parseBearer(header: string | undefined): string | null {
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1]! : null;
}

function b64UrlDecode(s: string): string {
  return b64UrlDecodeBuffer(s).toString('utf-8');
}

function b64UrlDecodeBuffer(s: string): Buffer {
  // Convert URL-safe to standard base64.
  let str = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = str.length % 4;
  if (pad === 2) str += '==';
  else if (pad === 3) str += '=';
  else if (pad !== 0) throw new Error(`invalid base64url: ${s}`);
  return Buffer.from(str, 'base64');
}
