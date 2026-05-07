# STORY-015 — Kafka / Redpanda event streaming provider

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-015 — Bucket B: Polyglot storage providers sprint](../epics/EPIC-015-bucket-b-polyglot-storage.md)

## User story

As the derivation pipeline, I want a Kafka/Redpanda provider so that raw interaction events can be published to a topic and consumed by downstream processors (summarizers, VoC extractor, churn model trainer) without tight coupling to the runtime.

## Context

ADR-032 specified Redpanda (Kafka-compatible) as the event bus for the raw → derived derivation pipeline. The provider implements produce + consume over the Kafka protocol, with Redpanda as the default broker in Docker Compose.

## Done when

- `runtime/src/memory/kafka.ts` implements producer and consumer for interaction event topics.
- Provider registered in runtime barrel.
- Unit tests added and passing.
