/**
 * EventStream — Phase 5 (ADR-008).
 *
 * Cross-runtime event distribution. Per ADR-008 the polyglot event bus is
 * Redpanda/Kafka-compatible: every meaningful runtime action (instruction
 * received, plan completed, layout broadcast, eval signal recorded, churn
 * score crossed threshold) becomes a typed event a downstream consumer can
 * subscribe to.
 *
 * Provider-shape: `publish(topic, event)` and `subscribe(topic, handler)`.
 * The runtime calls `publish()` from key lifecycle points; downstream
 * services (ML pipelines, BI ETL, alerting) subscribe to consume.
 *
 * The interface intentionally hides the broker. Three implementations:
 *   • InMemoryEventStream  — process-local fan-out; default for dev/test.
 *   • KafkaEventStream     — kafkajs-compatible adapter; production.
 *   • NoopEventStream      — drops everything; for hosts that don't want events.
 */

export interface RuntimeEvent {
  /** Stable topic the consumer subscribes against. */
  topic: string;
  /** Free-form payload — host & topic decide the schema. */
  payload: unknown;
  /** ISO-8601 emit time. Server stamps if missing on publish(). */
  at?: string;
  /** Optional correlation key (sessionId, composeCycleId, etc). */
  key?: string;
}

export type EventHandler = (event: RuntimeEvent) => void | Promise<void>;

export interface EventStream {
  readonly name: string;
  /** Publish an event. Implementations may resolve before delivery completes. */
  publish(event: RuntimeEvent): Promise<void>;
  /** Subscribe to a topic; returns disposer. */
  subscribe(topic: string, handler: EventHandler): () => void;
  /** Cleanly shut down (flushes pending writes, disconnects from broker). */
  close?(): Promise<void>;
}

/** Canonical topic names the runtime publishes to. */
export const RuntimeTopics = {
  Instruction: 'saasagent.instruction',
  PlanCompleted: 'saasagent.plan.completed',
  LayoutBroadcast: 'saasagent.layout.broadcast',
  EvalSignal: 'saasagent.eval.signal',
  ChurnRiskScore: 'saasagent.churn.score',
} as const;
