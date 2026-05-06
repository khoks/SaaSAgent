/**
 * Planner module barrel — Phase 2.1.
 *
 *   • StubPlanner   (2.1a) — deterministic routing only.
 *   • SonnetPlanner (2.1b) — claude-sonnet-4-6 with native tool_use API.
 */

export type { Planner, PlanRequest, PlanResult, ToolInvocation } from './types.js';
export { StubPlanner } from './stub.js';
