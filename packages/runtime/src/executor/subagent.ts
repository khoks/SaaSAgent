/**
 * SubAgentExecutor — Phase 2.4.
 *
 * Sub-agents are the third tier of ADR-021's capability model: separate
 * runtimes/services that own their own planner + skills + tools. The parent
 * runtime delegates over a federation contract:
 *
 *   POST <descriptor.endpoint>
 *     body:    FederationRequest  { intent, payload?, sessionId?, prefetched? }
 *     response: FederationResponse { narration?, output?, invocations?, error? }
 *
 * SubAgentExecutor wraps this HTTP call into the same `ExecutionResult` shape
 * the SkillExecutor and ToolExecutor return — so the planner's tool-dispatch
 * code (Phase 2.1b) treats sub-agents identically. The result.output is the
 * parsed FederationResponse so callers can read narration / invocations /
 * structured output.
 */

import type {
  FederationRequest,
  FederationResponse,
  SubAgentDescriptor,
} from '@saasagent/protocol';

import type { CapabilityInvocationRecord } from '../capeval/types.js';
import type { SubAgentRegistryStore } from '../registry/subagents.js';
import { fireOnInvocation } from './skill.js';
import type { ExecutionContext, ExecutionResult } from './types.js';

const DEFAULT_TIMEOUT_MS = 15000;

export interface SubAgentExecutorOptions {
  registry: SubAgentRegistryStore;
  /** Override fetch (for tests). Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Override env reader (for tests). */
  env?: (name: string) => string | undefined;
  /** Default timeout if descriptor doesn't specify. Default 15000ms (sub-agents may take longer than tools). */
  defaultTimeoutMs?: number;
  /** Phase 6: capability-eval hook; fires after every execute() returns. */
  onInvocation?: (record: CapabilityInvocationRecord) => void;
}

export interface SubAgentInvokeRequest extends FederationRequest {
  /** No additional fields for now — SubAgentExecutor.execute() forwards verbatim. */
}

export class SubAgentExecutor {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly envFn: (name: string) => string | undefined;
  private readonly defaultTimeoutMs: number;

  constructor(private readonly options: SubAgentExecutorOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.envFn = options.env ?? ((n) => process.env[n]);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async execute<O extends FederationResponse = FederationResponse>(
    name: string,
    input: SubAgentInvokeRequest,
    ctx: ExecutionContext = {},
  ): Promise<ExecutionResult<O>> {
    const at = new Date().toISOString();
    const result = await this._execute<O>(name, input, ctx);
    fireOnInvocation(this.options.onInvocation, 'subagent', name, input, ctx, at, result);
    return result;
  }

  private async _execute<O extends FederationResponse = FederationResponse>(
    name: string,
    input: SubAgentInvokeRequest,
    ctx: ExecutionContext = {},
  ): Promise<ExecutionResult<O>> {
    const start = Date.now();
    const descriptor = this.options.registry.get().subAgents[name];
    if (!descriptor) {
      return {
        ok: false,
        error: { code: 'unknown-tool', message: `No sub-agent registered with name "${name}"` },
        durationMs: Date.now() - start,
      };
    }
    if (descriptor.transport !== 'http') {
      return {
        ok: false,
        error: {
          code: 'unsupported-kind',
          message: `Sub-agent "${name}" transport=${descriptor.transport} is not supported (MVP supports 'http' only)`,
        },
        durationMs: Date.now() - start,
      };
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
      'content-type': 'application/json',
      ...(descriptor.headers ?? {}),
    };
    const auth = descriptor.auth ?? 'none';
    const authResult = this.applyAuth(descriptor, auth, headers, ctx);
    if (authResult) return { ...authResult, durationMs: Date.now() - start };

    const body: FederationRequest = {
      intent: input.intent,
      ...(input.payload ? { payload: input.payload } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.userId ? { userId: input.userId } : {}),
      ...(input.prefetched ? { prefetched: input.prefetched } : {}),
    };

    const controller = new AbortController();
    const timeoutMs = descriptor.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await this.fetcher(descriptor.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        let respBody: string | undefined;
        try {
          respBody = await res.text();
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          error: {
            code: 'http-status',
            status: res.status,
            message: `Sub-agent "${name}" returned HTTP ${res.status}${respBody ? `: ${respBody.slice(0, 200)}` : ''}`,
          },
          durationMs: Date.now() - start,
        };
      }
      let parsed: FederationResponse;
      try {
        parsed = (await res.json()) as FederationResponse;
      } catch (err) {
        return {
          ok: false,
          error: {
            code: 'invalid-json',
            message: `Sub-agent "${name}" returned non-JSON federation response`,
            cause: err,
          },
          durationMs: Date.now() - start,
        };
      }
      // Sub-agent reported a soft error in its FederationResponse — surface as a
      // failed ExecutionResult so the planner sees it as is_error in tool_result.
      if (parsed.error) {
        return {
          ok: false,
          error: {
            code: 'handler-threw',
            message: `Sub-agent "${name}" reported: ${parsed.error.message} (${parsed.error.code})`,
          },
          durationMs: Date.now() - start,
        };
      }
      return { ok: true, output: parsed as O, durationMs: Date.now() - start };
    } catch (err) {
      const isAbort =
        (err as { name?: string } | null)?.name === 'AbortError' ||
        (err instanceof Error && /aborted/i.test(err.message));
      if (isAbort) {
        return {
          ok: false,
          error: { code: 'timeout', message: `Sub-agent "${name}" timed out after ${timeoutMs}ms` },
          durationMs: Date.now() - start,
        };
      }
      return {
        ok: false,
        error: {
          code: 'http-network',
          message: err instanceof Error ? err.message : String(err),
          cause: err,
        },
        durationMs: Date.now() - start,
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /** Returns an error result (without durationMs) if auth config is invalid; null on success. */
  private applyAuth(
    descriptor: SubAgentDescriptor,
    auth: NonNullable<SubAgentDescriptor['auth']>,
    headers: Record<string, string>,
    ctx: ExecutionContext,
  ): Omit<Extract<ExecutionResult, { ok: false }>, 'durationMs'> | null {
    if (auth === 'bearer-env') {
      if (!descriptor.authEnvVar) {
        return {
          ok: false,
          error: {
            code: 'tool-config',
            message: `Sub-agent "${descriptor.name}" auth='bearer-env' but no authEnvVar set`,
          },
        };
      }
      const token = this.envFn(descriptor.authEnvVar);
      if (!token) {
        return {
          ok: false,
          error: {
            code: 'tool-config',
            message: `Sub-agent "${descriptor.name}" expects env var ${descriptor.authEnvVar} but it is unset`,
          },
        };
      }
      headers['authorization'] = `Bearer ${token}`;
    } else if (auth === 'host-supplied' && ctx.hostHeaders) {
      Object.assign(headers, ctx.hostHeaders);
    }
    return null;
  }
}
