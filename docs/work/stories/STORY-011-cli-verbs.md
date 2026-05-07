# STORY-011 — CLI init / registry / eval verbs

- **Status:** done
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Completed:** 2026-05-06
- **Parent epic:** [EPIC-014 — Bucket A: Foundation capabilities sprint](../epics/EPIC-014-bucket-a-foundation-capabilities.md)

## User story

As a developer onboarding to SaaSAgent, I want a `saasagent` CLI with `init <sub-agent|host> <name>`, `registry`, and `eval` verbs so that I can scaffold a new agent, inspect live registries, and run evals without writing boilerplate.

## Context

The CLI package (`@saasagent/cli`) had a placeholder `agentsaas` binary. This story implements the three primary developer verbs used in the demo flow and referenced in ADR-036 (build team tooling).

## Done when

- `cli/src/index.ts` implements `init <sub-agent|host> <name>`, `registry [--host]`, and `eval [--skill]`.
- `init` scaffolds the correct package structure for the chosen template.
- 11 CLI tests added and passing.
