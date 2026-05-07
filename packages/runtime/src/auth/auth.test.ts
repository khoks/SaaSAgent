import { describe, it, expect } from 'vitest';
import { createHmac, createSign, generateKeyPairSync } from 'node:crypto';

import { NoAuthProvider, BearerTokenAuthProvider, JWTAuthProvider } from './index.js';

describe('NoAuthProvider', () => {
  it('always returns ok with anonymous principal', () => {
    const r = new NoAuthProvider().authenticate({});
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.principal.id).toBe('anonymous');
  });
});

describe('BearerTokenAuthProvider', () => {
  it('throws on empty token', () => {
    expect(() => new BearerTokenAuthProvider({ token: '' })).toThrow(/non-empty/);
  });

  it('rejects when no credential is provided', () => {
    const r = new BearerTokenAuthProvider({ token: 'sk-test-1' }).authenticate({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('missing-credential');
  });

  it('accepts the matching Authorization header', () => {
    const r = new BearerTokenAuthProvider({ token: 'sk-test-1' }).authenticate({
      authorization: 'Bearer sk-test-1',
    });
    expect(r.ok).toBe(true);
  });

  it('accepts queryToken (WS upgrade path)', () => {
    const r = new BearerTokenAuthProvider({ token: 'sk-test-1' }).authenticate({
      queryToken: 'sk-test-1',
    });
    expect(r.ok).toBe(true);
  });

  it('rejects wrong token', () => {
    const r = new BearerTokenAuthProvider({ token: 'sk-test-1' }).authenticate({
      authorization: 'Bearer wrong',
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('invalid-token');
  });

  it('rejects malformed Authorization header', () => {
    const r = new BearerTokenAuthProvider({ token: 'sk-test-1' }).authenticate({
      authorization: 'NotBearer xxx',
    });
    expect(r.ok).toBe(false);
  });

  it('attaches the configured principal on success', () => {
    const r = new BearerTokenAuthProvider({
      token: 't',
      principal: { id: 'svc-billing', tenantId: 'tenant-a' },
    }).authenticate({ authorization: 'Bearer t' });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.id).toBe('svc-billing');
      expect(r.principal.tenantId).toBe('tenant-a');
    }
  });
});

describe('JWTAuthProvider — HS256', () => {
  const secret = 'shhh-secret-key';

  function mkHs256(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const enc = (o: unknown): string =>
      Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signingInput = `${enc(header)}.${enc(payload)}`;
    const sig = createHmac('sha256', secret)
      .update(signingInput)
      .digest('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return `${signingInput}.${sig}`;
  }

  it('verifies a well-formed HS256 token + extracts principal id from sub', () => {
    const tok = mkHs256({ sub: 'user-42', tenant: 'acme' });
    const provider = new JWTAuthProvider({ key: secret, algorithm: 'HS256' });
    const r = provider.authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.id).toBe('user-42');
      expect(r.principal.tenantId).toBe('acme');
    }
  });

  it('rejects token signed with a different secret', () => {
    const tok = mkHs256({ sub: 'user-42' });
    const provider = new JWTAuthProvider({ key: 'wrong-secret', algorithm: 'HS256' });
    const r = provider.authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('bad-signature');
  });

  it('rejects expired tokens', () => {
    const tok = mkHs256({ sub: 'u', exp: 100 }); // expired epoch
    const r = new JWTAuthProvider({ key: secret, now: () => 1000 }).authenticate({
      authorization: `Bearer ${tok}`,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('token-expired');
  });

  it('respects clock-skew tolerance for nbf', () => {
    const tok = mkHs256({ sub: 'u', nbf: 1000 });
    // Within the 30-second tolerance — should pass at now=975.
    const ok = new JWTAuthProvider({ key: secret, now: () => 975 }).authenticate({
      authorization: `Bearer ${tok}`,
    });
    expect(ok.ok).toBe(true);
    // Beyond tolerance — fails at now=900.
    const bad = new JWTAuthProvider({ key: secret, now: () => 900 }).authenticate({
      authorization: `Bearer ${tok}`,
    });
    expect(bad.ok).toBe(false);
  });

  it('enforces expectedAudience when configured', () => {
    const goodTok = mkHs256({ sub: 'u', aud: 'saasagent-api' });
    const badTok = mkHs256({ sub: 'u', aud: 'other-service' });
    const provider = new JWTAuthProvider({ key: secret, expectedAudience: 'saasagent-api' });
    expect(provider.authenticate({ authorization: `Bearer ${goodTok}` }).ok).toBe(true);
    expect(provider.authenticate({ authorization: `Bearer ${badTok}` }).ok).toBe(false);
  });

  it('enforces expectedIssuer when configured', () => {
    const tok = mkHs256({ sub: 'u', iss: 'their-idp' });
    const provider = new JWTAuthProvider({ key: secret, expectedIssuer: 'our-idp' });
    const r = provider.authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('issuer-mismatch');
  });

  it('rejects algorithm mismatch (e.g. token=none on a HS256-required gate)', () => {
    const tok = mkHs256({ sub: 'u' }).replace(/^[^.]+/, Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_'));
    const r = new JWTAuthProvider({ key: secret }).authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/algorithm-mismatch/);
  });

  it('exposes leftover claims under principal.claims', () => {
    const tok = mkHs256({ sub: 'u', role: 'admin', scopes: ['read', 'write'] });
    const r = new JWTAuthProvider({ key: secret }).authenticate({
      authorization: `Bearer ${tok}`,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.claims).toMatchObject({ role: 'admin', scopes: ['read', 'write'] });
      // sub/tenant should not also appear in claims.
      expect((r.principal.claims as Record<string, unknown>).sub).toBeUndefined();
    }
  });

  it('rejects malformed tokens (not three dot-separated parts)', () => {
    const r = new JWTAuthProvider({ key: secret }).authenticate({ authorization: 'Bearer not-a-jwt' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('malformed-jwt');
  });
});

describe('JWTAuthProvider — RS256', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

  function mkRs256(payload: Record<string, unknown>): string {
    const header = { alg: 'RS256', typ: 'JWT' };
    const enc = (o: unknown): string =>
      Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const signingInput = `${enc(header)}.${enc(payload)}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    const sig = signer
      .sign(privateKey)
      .toString('base64')
      .replace(/=+$/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return `${signingInput}.${sig}`;
  }

  it('verifies an RS256 token with the right public key', () => {
    const tok = mkRs256({ sub: 'svc-1' });
    const provider = new JWTAuthProvider({
      key: publicKey.export({ type: 'spki', format: 'pem' }) as string,
      algorithm: 'RS256',
    });
    const r = provider.authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.principal.id).toBe('svc-1');
  });

  it('rejects an RS256 token signed with a different key', () => {
    const tok = mkRs256({ sub: 'svc-1' });
    const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey;
    const provider = new JWTAuthProvider({
      key: otherKey.export({ type: 'spki', format: 'pem' }) as string,
      algorithm: 'RS256',
    });
    const r = provider.authenticate({ authorization: `Bearer ${tok}` });
    expect(r.ok).toBe(false);
  });
});
