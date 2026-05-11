# TASK-002 — Bad input-wrapping 400 with example

- **Status:** done
- **Story:** [STORY-008 — Close 5 enterprise-onboarding gaps](../stories/STORY-008-close-onboarding-gaps.md)
- **Created:** 2026-05-11
- **Last updated:** 2026-05-11
- **Completed:** 2026-05-11

## What
When a caller sends `{input:{...}}` (wrong — body root IS the input), the executor now returns HTTP 400 with `{error, detail, example}` showing the correct curl shape. Previously the error was terse and gave no hint.

## Files changed
- `packages/runtime/src/transport/server.ts:728`
