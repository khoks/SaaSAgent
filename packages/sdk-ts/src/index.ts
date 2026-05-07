/**
 * @saasagent/sdk-ts — Sub-Agent SDK.
 *
 * Per ADR-021: domain teams ship sub-agent runtimes that the parent runtime
 * delegates to via HTTP federation (Phase 2.4 + 2.4.x). This SDK is a thin
 * declarative wrapper around the runtime — instead of hand-writing a Runtime
 * + handlers, you describe your sub-agent and the SDK wires everything up.
 *
 * Usage:
 *
 *   import { defineSubAgent } from '@saasagent/sdk-ts';
 *   import type { SkillHandler } from '@saasagent/runtime';
 *
 *   const fetchWeather: SkillHandler<{ city: string }, { tempC: number }> =
 *     async (input) => ({ tempC: 18 });
 *
 *   const app = defineSubAgent({
 *     name: 'weather-specialist',
 *     description: 'Specialist for current weather + forecasts.',
 *     skills: [
 *       {
 *         descriptor: {
 *           name: 'fetch-weather',
 *           version: '1.0.0',
 *           description: 'Look up current weather for a city',
 *           whenToUse: 'when the user asks about weather',
 *           kind: 'in-process',
 *         },
 *         handler: fetchWeather,
 *       },
 *     ],
 *   });
 *
 *   await app.start({ port: 8081 });
 *   // Optional: push-register to a parent runtime's /registry/subagents
 *   await app.registerWith({ parentUrl: 'http://parent:8080', endpoint: 'http://localhost:8081/federate' });
 *
 * The sub-agent's planner is whatever the runtime configures (StubPlanner
 * without an API key, SonnetPlanner with one). The /federate endpoint comes
 * for free — Phase 2.4.x added it to the base runtime.
 */

import type {
  SkillDescriptor,
  ToolDescriptor,
  FeatureDescriptor,
  SubAgentDescriptor,
} from '@saasagent/protocol';
import type {
  Runtime as RuntimeT,
  RuntimeConfig,
  SkillHandler,
} from '@saasagent/runtime';

export const VERSION = '0.1.0';

export interface SubAgentSkillSpec<I = unknown, O = unknown> {
  descriptor: SkillDescriptor;
  handler: SkillHandler<I, O>;
}

export interface DefineSubAgentOptions {
  /** Stable name (used for register-with + logging). */
  name: string;
  /** Semantic version. */
  version?: string;
  /** Description (used when push-registering with a parent). */
  description?: string;
  /** When the parent should delegate to this sub-agent. */
  whenToUse?: string;
  /** Skills (with handlers) to register on this runtime. */
  skills?: ReadonlyArray<SubAgentSkillSpec>;
  /** Tools (HTTP descriptors) to register on this runtime. */
  tools?: ReadonlyArray<ToolDescriptor>;
  /** Features (.feature.md style domain context) to register. */
  features?: ReadonlyArray<FeatureDescriptor>;
  /** Forward extra runtime config (auth token, planner choice, etc). */
  runtimeConfig?: RuntimeConfig;
}

export interface SubAgentStartOptions {
  /** TCP port. Default 8081. */
  port?: number;
}

export interface RegisterWithOptions {
  /** Parent runtime URL (e.g. http://localhost:8080). */
  parentUrl: string;
  /** Federation endpoint the parent will POST to (e.g. http://localhost:8081/federate). */
  endpoint: string;
  /** Bearer token for the parent's REST API, if its authToken is set. */
  parentAuthToken?: string;
  /** Override descriptor fields. */
  overrides?: Partial<SubAgentDescriptor>;
}

/**
 * The sub-agent app — handle to the underlying runtime + lifecycle helpers.
 */
export interface SubAgentApp {
  /** Underlying runtime instance (advanced usage / test inspection). */
  readonly runtime: RuntimeT;
  /** Sub-agent name (matches DefineSubAgentOptions.name). */
  readonly name: string;
  /** Start the runtime listening on the given port. */
  start(opts?: SubAgentStartOptions): Promise<void>;
  /** Stop the runtime. */
  stop(): Promise<void>;
  /**
   * Optional: push-register this sub-agent with a parent runtime's
   * /registry/subagents so the parent's planner can discover + delegate to it.
   * No-op unless explicitly invoked.
   */
  registerWith(opts: RegisterWithOptions): Promise<void>;
}

/**
 * Declarative entry point. Returns a SubAgentApp wrapping a configured Runtime.
 *
 * Loads the runtime lazily (dynamic import) so consumers that want only the
 * type definitions don't pay for the runtime bundle.
 */
export async function defineSubAgent(opts: DefineSubAgentOptions): Promise<SubAgentApp> {
  // Dynamic import keeps `@saasagent/runtime` an optional peer for type-only
  // consumers; sub-agent authors who actually start a server will resolve it.
  const runtimeMod = (await import('@saasagent/runtime')) as typeof import('@saasagent/runtime');
  const runtime = new runtimeMod.Runtime(opts.runtimeConfig ?? {});

  // Pre-register skills + their handlers BEFORE start() so they're available
  // to the planner from the very first request.
  if (opts.skills?.length) {
    runtime.skillRegistry.replace(opts.skills.map((s) => s.descriptor));
    for (const s of opts.skills) {
      runtime.skillExecutor.registerHandler(s.descriptor.name, s.handler);
    }
  }
  if (opts.tools?.length) runtime.toolRegistry.replace(opts.tools);
  if (opts.features?.length) runtime.featureRegistry.replace(opts.features);

  const app: SubAgentApp = {
    runtime,
    name: opts.name,
    async start(startOpts?: SubAgentStartOptions): Promise<void> {
      if (startOpts?.port !== undefined) {
        // Runtime constructor takes config.port — but we already constructed it.
        // Mutate the config (or rebuild). Simplest: use Runtime's existing public
        // config field which is readonly but still mutable through `as`.
        (runtime.config as RuntimeConfig).port = startOpts.port;
      }
      await runtime.start();
    },
    async stop(): Promise<void> {
      await runtime.stop();
    },
    async registerWith(reg: RegisterWithOptions): Promise<void> {
      const descriptor: SubAgentDescriptor = {
        name: opts.name,
        version: opts.version ?? '0.1.0',
        description: opts.description ?? `Sub-agent: ${opts.name}`,
        whenToUse: opts.whenToUse ?? `delegate to ${opts.name} for its capabilities`,
        transport: 'http',
        endpoint: reg.endpoint,
        ...reg.overrides,
      };
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (reg.parentAuthToken) headers.authorization = `Bearer ${reg.parentAuthToken}`;
      const url = `${reg.parentUrl.replace(/\/$/, '')}/registry/subagents`;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(descriptor),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `[saasagent/sdk] registerWith failed: HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ''}`,
        );
      }
    },
  };
  return app;
}

// Re-export a few protocol types that sub-agent authors commonly need so
// they don't need a separate @saasagent/protocol import.
export type {
  SkillDescriptor,
  ToolDescriptor,
  FeatureDescriptor,
  SubAgentDescriptor,
} from '@saasagent/protocol';
