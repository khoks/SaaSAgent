/**
 * Auth module barrel — Phase 6 (Bucket C.1).
 *
 * Pluggable auth gate. Implementations:
 *   • NoAuthProvider          — always-allow; tests / dev.
 *   • BearerTokenAuthProvider — shared-secret bearer; matches Phase 2.7 behavior.
 *   • JWTAuthProvider         — HS256 / RS256 JWT verification.
 */

export type { AuthProvider, AuthInput, AuthResult, AuthPrincipal } from './types.js';
export { NoAuthProvider } from './types.js';
export {
  BearerTokenAuthProvider,
  type BearerTokenAuthProviderOptions,
  parseBearer,
  constantTimeEq,
} from './bearer.js';
export {
  JWTAuthProvider,
  type JWTAuthProviderOptions,
  type JWTAlgorithm,
} from './jwt.js';
