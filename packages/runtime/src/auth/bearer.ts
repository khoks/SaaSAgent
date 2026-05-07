/**
 * BearerTokenAuthProvider — Phase 6 (Bucket C.1).
 *
 * Constant-time check of `Authorization: Bearer <token>` (or `?token=` query
 * param for WS). Single shared secret — matches the Phase 2.7 inline check
 * but behind the AuthProvider interface so it can compose with other gates.
 *
 * Optional principalId (default: 'shared-secret') so logs distinguish this
 * gate from anonymous access. Pass a richer claims object for multi-tenant
 * deployments that share a token.
 */

import type { AuthInput, AuthProvider, AuthResult, AuthPrincipal } from './types.js';

export interface BearerTokenAuthProviderOptions {
  /** Shared secret. Required. */
  token: string;
  /** Principal returned on success. Default `{ id: 'shared-secret' }`. */
  principal?: AuthPrincipal;
}

export class BearerTokenAuthProvider implements AuthProvider {
  readonly name = 'bearer-token';
  private readonly token: string;
  private readonly principal: AuthPrincipal;

  constructor(opts: BearerTokenAuthProviderOptions) {
    if (!opts.token || opts.token.length === 0) {
      throw new Error('BearerTokenAuthProvider requires a non-empty token');
    }
    this.token = opts.token;
    this.principal = opts.principal ?? { id: 'shared-secret' };
  }

  authenticate(input: AuthInput): AuthResult {
    const provided = parseBearer(input.authorization) ?? input.queryToken ?? null;
    if (!provided) return { ok: false, reason: 'missing-credential' };
    if (!constantTimeEq(provided, this.token)) {
      return { ok: false, reason: 'invalid-token' };
    }
    return { ok: true, principal: this.principal };
  }
}

export function parseBearer(header: string | undefined): string | null {
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(header);
  return match ? match[1]! : null;
}

export function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
