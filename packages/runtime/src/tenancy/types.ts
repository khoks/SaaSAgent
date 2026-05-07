/**
 * Multi-tenant isolation — Phase 6 (Bucket C.3).
 *
 * The single-tenant runtime registers skills/tools/features/sub-agents at
 * the runtime level, where they're shared across all sessions. Multi-tenant
 * deployments need per-tenant scoping so tenant A's skill registrations
 * don't leak into tenant B's planner context.
 *
 * Design: tenancy is a concern at the REGISTRY layer, not the runtime layer.
 * Each tenant gets its own underlying registry instance; a `MultiTenantXRegistry`
 * wraps a tenant→registry Map and routes calls based on the supplied tenantId.
 *
 * Tenant resolution flow:
 *   1. Auth provider (C.1) authenticates the request and may set
 *      principal.tenantId.
 *   2. RuntimeServer threads tenantId into PlanRequest + ComposeContext.
 *   3. SonnetPlanner queries the multi-tenant registry with the request's
 *      tenantId, getting a tenant-scoped view.
 *   4. SkillExecutor handlers + ToolExecutor calls operate against the
 *      tenant-scoped registry.
 *
 * Memory + Eval providers are already keyed by sessionId; with multi-tenancy
 * we prefix sessionId with `${tenantId}::` so providers stay correctly scoped
 * without their interfaces changing.
 *
 * The single-tenant pattern still works — when no tenantId is supplied,
 * everything routes through a `__default__` tenant.
 */

export const DEFAULT_TENANT = '__default__';

/** Resolve a sessionId into a tenant-scoped form. */
export function tenantScopedSessionId(tenantId: string | undefined, sessionId: string | undefined): string {
  if (!sessionId) return tenantId ?? DEFAULT_TENANT;
  return `${tenantId ?? DEFAULT_TENANT}::${sessionId}`;
}

/** Reverse: extract tenantId + raw sessionId from a scoped form. */
export function parseScopedSessionId(scoped: string): { tenantId: string; sessionId: string | null } {
  const idx = scoped.indexOf('::');
  if (idx === -1) return { tenantId: scoped, sessionId: null };
  return { tenantId: scoped.slice(0, idx), sessionId: scoped.slice(idx + 2) };
}
