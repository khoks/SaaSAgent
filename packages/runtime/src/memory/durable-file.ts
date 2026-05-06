/**
 * DurableFileMemoryProvider — Phase 2.3.x.
 *
 * Persists conversation turns to a JSON file on disk. Survives runtime restarts,
 * unlike KeyValueMemoryProvider's in-process Map. Same interface as the other
 * providers — drop in via `runtime.memoryProvider = new DurableFileMemoryProvider(...)`.
 *
 * Storage shape (atomic write via temp file + rename):
 *   {
 *     "version": 1,
 *     "sessions": { "<sessionId>": ConversationTurn[] }
 *   }
 *
 * Trade-offs vs Postgres:
 *   ✓ Zero infrastructure — works on any laptop, no daemon.
 *   ✓ Atomic writes (temp file + rename = crash-safe).
 *   ✗ Single-writer only — concurrent runtime processes will clobber.
 *   ✗ Not horizontally scalable — load entire file at startup.
 *
 * Use this for single-instance dev/demo deployments where you want continuity
 * across restarts. For multi-instance production, use PostgresMemoryProvider.
 */

import { promises as fs } from 'node:fs';
import { dirname } from 'node:path';

import type { ConversationTurn, MemoryRecall } from '@saasagent/protocol';

import type { MemoryProvider, MemoryQuery } from './types.js';

const FORMAT_VERSION = 1;
const DEFAULT_SESSION = '__default__';

interface DiskFormat {
  version: number;
  sessions: Record<string, ConversationTurn[]>;
}

export interface DurableFileMemoryProviderOptions {
  /** Absolute path to the JSON file. Created if missing. */
  filePath: string;
  /** Max turns retained per session. Default 100. */
  maxPerSession?: number;
  /** Default recall limit. Default 10. */
  defaultRecallLimit?: number;
  /** Flush strategy: 'each' (default — every record() flushes) or 'manual' (call flush()). */
  flushStrategy?: 'each' | 'manual';
}

export class DurableFileMemoryProvider implements MemoryProvider {
  readonly name = 'durable-file';
  private sessions: Map<string, ConversationTurn[]> = new Map();
  private readonly filePath: string;
  private readonly maxPerSession: number;
  private readonly defaultRecallLimit: number;
  private readonly flushStrategy: 'each' | 'manual';
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(options: DurableFileMemoryProviderOptions) {
    this.filePath = options.filePath;
    this.maxPerSession = options.maxPerSession ?? 100;
    this.defaultRecallLimit = options.defaultRecallLimit ?? 10;
    this.flushStrategy = options.flushStrategy ?? 'each';
  }

  /** Lazy-load on first read/write. Idempotent — concurrent calls share one promise. */
  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = this.loadFromDisk();
    try {
      await this.loadingPromise;
    } finally {
      this.loadingPromise = null;
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as DiskFormat;
      if (parsed.version === FORMAT_VERSION && parsed.sessions) {
        this.sessions = new Map(Object.entries(parsed.sessions));
      }
    } catch (err) {
      // ENOENT = first run, perfectly fine. Other errors → log + start empty.
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.warn(`[durable-file-memory] failed to load ${this.filePath}: ${(err as Error).message}; starting empty`);
      }
    }
    this.loaded = true;
  }

  /** Public flush — useful with flushStrategy='manual' to coalesce writes. */
  async flush(): Promise<void> {
    // Serialize writes — append onto the existing queue so order is preserved.
    this.writeQueue = this.writeQueue.then(() => this.flushNow()).catch(() => undefined);
    return this.writeQueue;
  }

  private async flushNow(): Promise<void> {
    await fs.mkdir(dirname(this.filePath), { recursive: true });
    const data: DiskFormat = {
      version: FORMAT_VERSION,
      sessions: Object.fromEntries(this.sessions.entries()),
    };
    const json = JSON.stringify(data);
    const tmp = `${this.filePath}.tmp`;
    await fs.writeFile(tmp, json, 'utf-8');
    await fs.rename(tmp, this.filePath);
  }

  async recall(query: MemoryQuery): Promise<ReadonlyArray<MemoryRecall>> {
    await this.ensureLoaded();
    const sid = query.sessionId ?? DEFAULT_SESSION;
    const turns = this.sessions.get(sid);
    if (!turns || turns.length === 0) return [];
    const limit = query.limit ?? this.defaultRecallLimit;
    return turns.slice(-limit).map((turn) => ({
      store: 'in-memory' as const,
      summary: `${turn.speaker} (${turn.at}): ${truncate(turn.text, 200)}`,
    }));
  }

  async record(turn: ConversationTurn, sessionId?: string): Promise<void> {
    await this.ensureLoaded();
    const sid = sessionId ?? DEFAULT_SESSION;
    const list = this.sessions.get(sid) ?? [];
    list.push(turn);
    if (list.length > this.maxPerSession) {
      list.splice(0, list.length - this.maxPerSession);
    }
    this.sessions.set(sid, list);
    if (this.flushStrategy === 'each') {
      await this.flush();
    }
  }

  /** Inspection helpers (mirror KeyValueMemoryProvider for /memory REST). */
  getSession(sessionId: string): ReadonlyArray<ConversationTurn> {
    return [...(this.sessions.get(sessionId) ?? [])];
  }

  listSessions(): ReadonlyArray<string> {
    return [...this.sessions.keys()];
  }

  clearSession(sessionId: string): boolean {
    const had = this.sessions.delete(sessionId);
    if (had && this.flushStrategy === 'each') {
      void this.flush();
    }
    return had;
  }

  clearAll(): void {
    this.sessions.clear();
    if (this.flushStrategy === 'each') {
      void this.flush();
    }
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}
