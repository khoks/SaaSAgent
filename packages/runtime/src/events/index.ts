/**
 * Events module barrel — Phase 5 (ADR-008).
 *
 *   • InMemoryEventStream  — process-local fan-out; default.
 *   • KafkaEventStream     — kafkajs-compatible adapter for production.
 */

export type { EventStream, EventHandler, RuntimeEvent } from './types.js';
export { RuntimeTopics } from './types.js';
export { InMemoryEventStream } from './in-memory.js';
export {
  KafkaEventStream,
  type KafkaEventStreamOptions,
  type KafkaProducer,
  type KafkaConsumer,
} from './kafka.js';
