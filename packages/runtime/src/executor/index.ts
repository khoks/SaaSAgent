/**
 * Executor module barrel — Phase 2.0c.
 *
 * Two execution surfaces:
 *   • SkillExecutor — in-process handlers attached to SkillDescriptors.
 *   • ToolExecutor  — HTTP fetch driven by ToolDescriptors + URL substitution.
 *
 * The planner (Phase 2.1) consumes both via a single uniform `execute(name, input)`
 * contract — same `ExecutionResult` shape for both paths.
 */

export { SkillExecutor, type SkillExecutorOptions, type SkillHandler } from './skill.js';
export { ToolExecutor, type ToolExecutorOptions, substituteUrl } from './tool.js';
export {
  SubAgentExecutor,
  type SubAgentExecutorOptions,
  type SubAgentInvokeRequest,
} from './subagent.js';
export type {
  ExecutionContext,
  ExecutionResult,
  ExecutionError,
  ExecutionErrorCode,
} from './types.js';
