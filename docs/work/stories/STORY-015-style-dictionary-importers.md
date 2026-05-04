# STORY-015 — Style Dictionary and CSS variable importers for theme registry

- **Status:** done
- **Created:** 2026-05-08
- **Last updated:** 2026-05-08
- **Completed:** 2026-05-08
- **Parent epic:** [EPIC-003 — Phase 1 Composition](../epics/EPIC-003-phase-1-composition.md)

## User-visible behaviour

SaaS platform integrators can `PUT /registry/theme` with either a **Style Dictionary** JSON payload (`?format=style-dictionary`) or a **CSS custom-properties** file (`?format=css-variables&name=<theme>`). Both are normalised to DTCG canonical token format and stored in the theme registry, making them immediately available to the Haiku composer prompt.

## Done when

- Style Dictionary importer: converts `value` → `$value`, `comment` → `$description`, `attributes.category` → `$type`; infers type (color / dimension / duration).
- CSS variable importer: converts `--color-brand-primary` → `color.brand.primary`; infers type; strips comments; reads theme name from query param.
- Both endpoints return 200 with stored version.
- Covered by unit tests and validated end-to-end via browser smoke.

## Phase reference

Phase 1.4.4 — commit 31da46a (closes Phase 1.4)

## Result

- Tests: 105+ passing total after this slice.
- Both import formats verified via browser smoke (Style Dictionary → v1.0.0; CSS variables → v2.0.0; `/health` confirms version bump).
