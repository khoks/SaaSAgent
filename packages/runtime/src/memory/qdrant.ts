/**
 * QdrantMemoryProvider — Phase 2.3.x semantic recall.
 *
 * Stores conversation turns as vectors in a Qdrant collection so the planner
 * can pull semantically-related memory beyond the recent-N window. Uses
 * Qdrant's HTTP API directly (no qdrant-client dep) and an injectable embedding
 * function (host provides — Anthropic doesn't ship embeddings, so hosts wire
 * in OpenAI / Cohere / a local model).
 *
 * Recall flow:
 *   1. embed(query.text) → vector
 *   2. POST /collections/<name>/points/search { vector, limit, filter: { sessionId? } }
 *   3. Map points → MemoryRecall summaries
 *
 * Record flow:
 *   1. embed(turn.text) → vector
 *   2. PUT /collections/<name>/points { id: hash(turn), vector, payload: { speaker, at, text, sessionId } }
 *
 * Schema is auto-created on first write via ensureCollection() — uses cosine
 * distance and the host-supplied vector size (default 1536 for OpenAI ada-002).
 *
 * The HTTP client is injectable (for tests we pass a stub fetch). Hosts pass
 * their Qdrant URL + API key (when secured) at construction time.
 */

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import type { MemoryProvider, MemoryQuery } from './types.js';

/**
 * Function signature hosts implement to embed text. The host might call
 * OpenAI's embeddings API, a local sentence-transformer, etc.
 */
export type EmbeddingFn = (text: string) => Promise<number[]>;

export interface QdrantMemoryProviderOptions {
  /** Qdrant base URL — e.g. http://localhost:6333 */
  url: string;
  /** Collection name. Default 'saasagent_turns'. */
  collection?: string;
  /** API key (sent as `api-key` header). */
  apiKey?: string;
  /** Vector dimensionality. Default 1536 (OpenAI text-embedding-3-small). */
  vectorSize?: number;
  /** Distance metric. Default 'Cosine'. */
  distance?: 'Cosine' | 'Euclid' | 'Dot' | 'Manhattan';
  /** Required: function the provider calls to compute embeddings. */
  embed: EmbeddingFn;
  /** When true, ensureCollection() is auto-called on first read/write. Default true. */
  autoCreate?: boolean;
  /** Override fetch (for tests). */
  fetch?: typeof globalThis.fetch;
  /** Default recall limit. Default 8. */
  defaultRecallLimit?: number;
}

interface QdrantSearchResult {
  result: Array<{
    id: number | string;
    score: number;
    payload?: { speaker?: string; text?: string; at?: string; sessionId?: string };
  }>;
}

export class QdrantMemoryProvider implements MemoryProvider {
  readonly name = 'qdrant';
  private readonly url: string;
  private readonly collection: string;
  private readonly apiKey?: string;
  private readonly vectorSize: number;
  private readonly distance: NonNullable<QdrantMemoryProviderOptions['distance']>;
  private readonly embed: EmbeddingFn;
  private readonly autoCreate: boolean;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly defaultRecallLimit: number;
  private collectionEnsured = false;
  private ensureInflight: Promise<void> | null = null;

  constructor(opts: QdrantMemoryProviderOptions) {
    this.url = opts.url.replace(/\/$/, '');
    this.collection = opts.collection ?? 'saasagent_turns';
    if (opts.apiKey !== undefined) this.apiKey = opts.apiKey;
    this.vectorSize = opts.vectorSize ?? 1536;
    this.distance = opts.distance ?? 'Cosine';
    this.embed = opts.embed;
    this.autoCreate = opts.autoCreate ?? true;
    this.fetcher = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.defaultRecallLimit = opts.defaultRecallLimit ?? 8;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.apiKey) h['api-key'] = this.apiKey;
    return h;
  }

  /** Idempotent collection creation. */
  async ensureCollection(): Promise<void> {
    if (this.collectionEnsured) return;
    if (this.ensureInflight) return this.ensureInflight;
    this.ensureInflight = this.runEnsure();
    try {
      await this.ensureInflight;
    } finally {
      this.ensureInflight = null;
    }
  }

  private async runEnsure(): Promise<void> {
    // GET /collections/<name> — 200 if exists, 404 if not.
    const probe = await this.fetcher(`${this.url}/collections/${this.collection}`, {
      headers: this.headers(),
    });
    if (probe.ok) {
      this.collectionEnsured = true;
      return;
    }
    if (probe.status !== 404) {
      throw new Error(`[qdrant] unexpected probe status ${probe.status}`);
    }
    // PUT /collections/<name>
    const create = await this.fetcher(`${this.url}/collections/${this.collection}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        vectors: { size: this.vectorSize, distance: this.distance },
      }),
    });
    if (!create.ok) {
      const body = await create.text().catch(() => '');
      throw new Error(`[qdrant] create collection failed: ${create.status} ${body.slice(0, 200)}`);
    }
    this.collectionEnsured = true;
  }

  async recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    if (!query.text) return [];
    if (this.autoCreate) await this.ensureCollection();
    const vector = await this.embed(query.text);
    const limit = query.limit ?? this.defaultRecallLimit;
    const filter = query.sessionId
      ? { must: [{ key: 'sessionId', match: { value: query.sessionId } }] }
      : undefined;
    const res = await this.fetcher(`${this.url}/collections/${this.collection}/points/search`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        vector,
        limit,
        with_payload: true,
        ...(filter ? { filter } : {}),
      }),
    });
    if (!res.ok) {
      // Soft-fail: log and return empty so the planner doesn't blow up if
      // semantic recall is briefly unavailable.
      // eslint-disable-next-line no-console
      console.warn(`[qdrant] search failed: ${res.status}; returning empty recall`);
      return [];
    }
    const json = (await res.json()) as QdrantSearchResult;
    return json.result.map((p) => ({
      store: 'qdrant' as const,
      summary: `${p.payload?.speaker ?? 'unknown'} (${p.payload?.at ?? '?'}): ${truncate(p.payload?.text ?? '', 200)} [score=${p.score.toFixed(3)}]`,
    }));
  }

  async record(turn: ConversationTurn, sessionId?: string): Promise<void> {
    if (this.autoCreate) await this.ensureCollection();
    const vector = await this.embed(turn.text);
    // Use a deterministic-ish id: timestamp epoch + a hash of speaker+text.
    // Qdrant accepts unsigned integers or UUIDs — we go with epoch milliseconds
    // (caller-side rebound to avoid collisions; small risk in dense bursts but
    // OK for a memory store).
    const id = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const res = await this.fetcher(`${this.url}/collections/${this.collection}/points`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify({
        points: [
          {
            id,
            vector,
            payload: {
              speaker: turn.speaker,
              text: turn.text,
              at: turn.at,
              sessionId: sessionId ?? '__default__',
            },
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.warn(`[qdrant] upsert failed: ${res.status} ${body.slice(0, 200)}`);
    }
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
