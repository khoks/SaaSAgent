/**
 * SkillExecutor — Phase 2.0c.
 *
 * Skills are JSON-defined behaviors (per ADR-021) but their executable bodies
 * live as JS/TS functions registered separately at runtime startup. This split
 * keeps SkillDescriptor JSON-serializable for REST + planner consumption while
 * letting the host attach arbitrary in-process code.
 *
 * Lookup flow on `execute(name, input, ctx)`:
 *   1. Read descriptor from SkillRegistryStore — if missing, return `unknown-skill`.
 *   2. If descriptor.kind === 'prompt-template', return `unsupported-kind`
 *      (handled by the planner in Phase 2.1 — needs a model call).
 *   3. Look up the handler — if none registered, return `no-handler`.
 *   4. Invoke handler with input + ctx; await Promise; return wrapped output
 *      or `handler-threw` on rejection.
 *
 * The `kind` is treated as planner-facing metadata; the executor's job is to
 * call the registered handler regardless of `in-process` vs `static-output`
 * (host wraps a static value as `() => value` if needed).
 */

import type { SkillRegistryStore } from '../registry/skills.js';
import type { ExecutionContext, ExecutionResult } from './types.js';

export type SkillHandler<I = unknown, O = unknown> = (
  input: I,
  ctx: ExecutionContext,
) => Promise<O> | O;

export interface SkillExecutorOptions {
  registry: SkillRegistryStore;
}

export class SkillExecutor {
  private handlers = new Map<string, SkillHandler>();

  constructor(private readonly options: SkillExecutorOptions) {}

  /**
   * Register an in-process handler for a skill name. Idempotent — re-registering
   * the same name replaces the previous handler. The skill's descriptor must
   * already be (or eventually be) registered in the SkillRegistryStore for the
   * planner to discover it; the handler is the runtime-side implementation.
   */
  registerHandler<I = unknown, O = unknown>(name: string, fn: SkillHandler<I, O>): void {
    this.handlers.set(name, fn as SkillHandler);
  }

  /** Drop a handler registration. Returns true if a handler was removed. */
  unregisterHandler(name: string): boolean {
    return this.handlers.delete(name);
  }

  /** True iff a handler is registered (regardless of whether the descriptor exists). */
  hasHandler(name: string): boolean {
    return this.handlers.has(name);
  }

  async execute<I = unknown, O = unknown>(
    name: string,
    input: I,
    ctx: ExecutionContext = {},
  ): Promise<ExecutionResult<O>> {
    const start = Date.now();
    const descriptor = this.options.registry.get().skills[name];
    if (!descriptor) {
      return {
        ok: false,
        error: { code: 'unknown-skill', message: `No skill registered with name "${name}"` },
        durationMs: Date.now() - start,
      };
    }
    if (descriptor.kind === 'prompt-template') {
      return {
        ok: false,
        error: {
          code: 'unsupported-kind',
          message: `Skill "${name}" has kind=prompt-template; the executor does not invoke these directly. The planner (Phase 2.1) will handle prompt-template skills.`,
        },
        durationMs: Date.now() - start,
      };
    }
    const handler = this.handlers.get(name);
    if (!handler) {
      return {
        ok: false,
        error: {
          code: 'no-handler',
          message: `Skill "${name}" (kind=${descriptor.kind}) has a descriptor but no registered handler. Call SkillExecutor.registerHandler() at startup.`,
        },
        durationMs: Date.now() - start,
      };
    }
    try {
      const output = await Promise.resolve(handler(input, ctx));
      return { ok: true, output: output as O, durationMs: Date.now() - start };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: 'handler-threw',
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        },
        durationMs: Date.now() - start,
      };
    }
  }
}
