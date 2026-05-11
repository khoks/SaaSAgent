---
id: STORY-011
title: Travel demo host + primitives + sub-agent
status: backlog
epic: EPIC-014
created: 2026-05-06
last-updated: 2026-05-06
---

# STORY-011 — Travel demo host + primitives + sub-agent

- **Status:** backlog
- **Created:** 2026-05-06
- **Last updated:** 2026-05-06
- **Parent epic:** [EPIC-014 — Phase 8: Demo verticals](../epics/EPIC-014-phase8-demo-verticals.md)

## User story
As a demo presenter, I need the 10-beat travel demo script to execute reliably end-to-end so that the multi-step planning depth of the orchestrator is demonstrable.

## Context
Anchor vertical: Expedia/Booking-style travel (per ADR-033 + INIT-002). Travel primitive stubs partially shipped in EPIC-011.

## Done when
- `apps/demo-travel` mock host app runs cleanly via Docker Compose.
- Atomic primitives registered: FlightCard, ItineraryTimeline, DateRangePicker, MultiCityRouteMap, HotelTile.
- Travel feature doc (`travel.feature.md`) covers Tokyo/Kyoto multi-step planning + change/cancel flows.
- Python trip-planning Sub-Agent federates over gRPC, streams candidate flights + hotels progressively.
- Itinerary-builder Skill wired and executes.
- All 10 beats of the travel demo script execute reliably without intervention.
- 2-day proactive re-engagement beat (weather change) works.
