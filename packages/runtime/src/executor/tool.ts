/**
 * ToolExecutor — Phase 2.0c.
 *
 * Tools are stateless HTTP calls (per ADR-021's three-tier model). The executor
 * looks up a ToolDescriptor by name, substitutes `{path.dot.notation}` parameters
 * from input args into urlTemplate, attaches headers + auth, runs `fetch()` with
 * an AbortController-based timeout, and returns the parsed body.
 *
 * Auth strategies:
 *   • 'none'          — no Authorization header.
 *   • 'bearer-env'    — reads token from `descriptor.authEnvVar` env var; missing
 *                       env var → `tool-config` error (NOT `no-handler` — the
 *                       descriptor is misconfigured, not unimplemented).
 *   • 'host-supplied' — merges `ctx.hostHeaders` into the request headers; lets
 *                       the host inject per-session auth without leaking secrets
 *                       into the descriptor.
 *
 * Body handling: GET + DELETE send no body; all other methods JSON.stringify(input).
 * Note: input args used for URL substitution are NOT removed from the body — the
 * full input is sent. Servers that care can ignore duplicates; this matches typical
 * REST patterns (e.g. PATCH /users/{id} with full user object).
 *
 * The executor accepts `fetch` + `env` overrides for testing. In production both
 * default to global Node 20 built-ins.
 */

import type { CapabilityInvocationRecord } from '../capeval/types.js';
import type { ToolRegistryStore } from '../registry/tools.js';
import { fireOnInvocation } from './skill.js';
import type { ExecutionContext, ExecutionResult } from './types.js';

const DEFAULT_TIMEOUT_MS = 5000;
const URL_PARAM_RE = /\{([^}]+)\}/g;

/** Return the value at a dot-delimited path in `obj`, or undefined if any segment is missing. */
function getByPath(obj: unknown, path: string): unknown {
  if (obj == null || typeof obj !== 'object') return undefined;
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc != null && typeof acc === 'object' && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/** Substitute `{paramName}` (or `{nested.key}`) in the template using values from `input`. */
export function substituteUrl(
  template: string,
  input: unknown,
): { url: string; missing: ReadonlyArray<string> } {
  const missing: string[] = [];
  const url = template.replace(URL_PARAM_RE, (_match, path: string) => {
    const v = getByPath(input, path);
    if (v == null) {
      missing.push(path);
      return '{' + path + '}';
    }
    return encodeURIComponent(String(v));
  });
  return { url, missing };
}

export interface ToolExecutorOptions {
  registry: ToolRegistryStore;
  /** Override fetch (for tests). Defaults to globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Override env reader (for tests). Defaults to (n) => process.env[n]. */
  env?: (name: string) => string | undefined;
  /** Default timeout if descriptor doesn't specify. Default 5000ms. */
  defaultTimeoutMs?: number;
  /** Phase 6: capability-eval hook; fires after every execute() returns. */
  onInvocation?: (record: CapabilityInvocationRecord) => void;
}

export class ToolExecutor {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly envFn: (name: string) => string | undefined;
  private readonly defaultTimeoutMs: number;

  constructor(private readonly options: ToolExecutorOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.envFn = options.env ?? ((n) => process.env[n]);
    this.defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async execute<I = unknown, O = unknown>(
    name: string,
    input: I,
    ctx: ExecutionContext = {},
  ): Promise<ExecutionResult<O>> {
    const at = new Date().toISOString();
    const result = await this._execute<I, O>(name, input, ctx);
    fireOnInvocation(this.options.onInvocation, 'tool', name, input, ctx, at, result);
    return result;
  }

  private async _execute<I = unknown, O = unknown>(
    name: string,
    input: I,
    ctx: ExecutionContext = {},
  ): Promise<ExecutionResult<O>> {
    const start = Date.now();
    const descriptor = this.options.registry.get().tools[name];
    if (!descriptor) {
      return {
        ok: false,
        error: { code: 'unknown-tool', message: `No tool registered with name "${name}"` },
        durationMs: Date.now() - start,
      };
    }

    const { url, missing } = substituteUrl(descriptor.urlTemplate, input);
    if (missing.length > 0) {
      return {
        ok: false,
        error: {
          code: 'missing-input-param',
          message: `Tool "${name}" URL template "${descriptor.urlTemplate}" needs args: ${missing.join(', ')}`,
        },
        durationMs: Date.now() - start,
      };
    }

    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(descriptor.headers ?? {}),
    };

    const auth = descriptor.auth ?? 'none';
    if (auth === 'bearer-env') {
      if (!descriptor.authEnvVar) {
        return {
          ok: false,
          error: {
            code: 'tool-config',
            message: `Tool "${name}" has auth='bearer-env' but no authEnvVar set in the descriptor`,
          },
          durationMs: Date.now() - start,
        };
      }
      const token = this.envFn(descriptor.authEnvVar);
      if (!token) {
        return {
          ok: false,
          error: {
            code: 'tool-config',
            message: `Tool "${name}" requires env var ${descriptor.authEnvVar} but it is unset`,
          },
          durationMs: Date.now() - start,
        };
      }
      headers['authorization'] = `Bearer ${token}`;
    } else if (auth === 'host-supplied' && ctx.hostHeaders) {
      Object.assign(headers, ctx.hostHeaders);
    }

    const method = descriptor.method;
    const sendsBody = method !== 'GET' && method !== 'DELETE';
    const init: RequestInit = { method, headers };
    if (sendsBody) {
      headers['content-type'] = 'application/json';
      init.body = JSON.stringify(input ?? {});
    }

    const controller = new AbortController();
    const timeoutMs = descriptor.timeoutMs ?? this.defaultTimeoutMs;
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    init.signal = controller.signal;

    try {
      const res = await this.fetcher(url, init);
      if (!res.ok) {
        let body: string | undefined;
        try {
          body = await res.text();
        } catch {
          /* ignore */
        }
        return {
          ok: false,
          error: {
            code: 'http-status',
            status: res.status,
            message: `Tool "${name}" returned HTTP ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}`,
          },
          durationMs: Date.now() - start,
        };
      }
      const contentType = res.headers.get('content-type') ?? '';
      let output: unknown;
      if (contentType.includes('application/json')) {
        try {
          output = await res.json();
        } catch (err) {
          return {
            ok: false,
            error: {
              code: 'invalid-json',
              message: `Tool "${name}" advertised JSON Content-Type but body failed to parse`,
              cause: err,
            },
            durationMs: Date.now() - start,
          };
        }
      } else {
        output = await res.text();
      }
      return { ok: true, output: output as O, durationMs: Date.now() - start };
    } catch (err) {
      const isAbort =
        (err as { name?: string } | null)?.name === 'AbortError' ||
        (err instanceof Error && /aborted/i.test(err.message));
      if (isAbort) {
        return {
          ok: false,
          error: {
            code: 'timeout',
            message: `Tool "${name}" timed out after ${timeoutMs}ms`,
          },
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
}
