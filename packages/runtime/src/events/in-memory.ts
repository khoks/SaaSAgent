/**
 * InMemoryEventStream — process-local fan-out.
 *
 * Same interface as KafkaEventStream so production swap is a single
 * constructor change. Subscribers are called in registration order; errors
 * inside one subscriber don't stop others.
 */

import type { EventHandler, EventStream, RuntimeEvent } from './types.js';

export class InMemoryEventStream implements EventStream {
  readonly name = 'in-memory';
  private readonly subscribers = new Map<string, Set<EventHandler>>();

  // eslint-disable-next-line @typescript-eslint/require-await
  async publish(event: RuntimeEvent): Promise<void> {
    const stamped: RuntimeEvent = { ...event, at: event.at ?? new Date().toISOString() };
    const handlers = this.subscribers.get(event.topic);
    if (!handlers) return;
    for (const h of handlers) {
      // Fire-and-forget — handlers can be async; their failures are isolated.
      void Promise.resolve()
        .then(() => h(stamped))
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.warn(`[in-memory-events] handler failed on ${event.topic}:`, err);
        });
    }
  }

  subscribe(topic: string, handler: EventHandler): () => void {
    const set = this.subscribers.get(topic) ?? new Set<EventHandler>();
    set.add(handler);
    this.subscribers.set(topic, set);
    return () => {
      const cur = this.subscribers.get(topic);
      cur?.delete(handler);
      if (cur && cur.size === 0) this.subscribers.delete(topic);
    };
  }

  /** Inspection helper — count of subscribers across all topics. */
  totalSubscribers(): number {
    let n = 0;
    for (const s of this.subscribers.values()) n += s.size;
    return n;
  }
}
