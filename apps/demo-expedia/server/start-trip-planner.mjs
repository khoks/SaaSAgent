/**
 * trip-planner sub-agent (Expedia).
 *
 * Reference for "how an enterprise team ships a specialist sub-agent" using
 * the @saasagent/sdk-ts declarative entry point. Spins up its own runtime on
 * :8082 with one skill — build-itinerary — and exposes /federate so the
 * parent Expedia runtime can delegate multi-day planning here.
 *
 * Per ADR-021 + P-003 (symmetric federation), this is just a runtime: it
 * could itself delegate further if it had nested sub-agents registered.
 *
 * Run:
 *   ANTHROPIC_API_KEY=... node apps/demo-expedia/server/start-trip-planner.mjs
 */

import { defineSubAgent } from '@saasagent/sdk';

// Mirror the parent's inventory so this specialist can synthesize a plan
// without recursively calling the parent.
const HOTELS = [
  { id: 'ho-001', name: 'Park Hyatt Tokyo', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 5, guestRating: 4.8, nightlyUSD: 612 },
  { id: 'ho-003', name: 'Hotel Gracery Shinjuku', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 4, guestRating: 4.4, nightlyUSD: 178 },
  { id: 'ho-005', name: 'Andaz Tokyo Toranomon Hills', city: 'Tokyo', neighborhood: 'Toranomon', starRating: 5, guestRating: 4.7, nightlyUSD: 538 },
];
const ACTIVITIES = [
  { id: 'ac-001', name: 'TeamLab Planets immersive art', city: 'Tokyo', category: 'museum', durationHours: 2, priceUSD: 38, rating: 4.8 },
  { id: 'ac-002', name: 'Tsukiji outer-market food tour', city: 'Tokyo', category: 'food', durationHours: 3, priceUSD: 95, rating: 4.9 },
  { id: 'ac-003', name: 'Mt. Fuji + Hakone day trip', city: 'Tokyo', category: 'outdoor', durationHours: 11, priceUSD: 145, rating: 4.6 },
  { id: 'ac-004', name: 'Robot Restaurant successor show', city: 'Tokyo', category: 'show', durationHours: 1.5, priceUSD: 88, rating: 4.3 },
  { id: 'ac-005', name: 'Shibuya guided night walk', city: 'Tokyo', category: 'tour', durationHours: 2.5, priceUSD: 52, rating: 4.7 },
];

/** build-itinerary — compose a day-by-day plan with one hotel + balanced activities. */
async function buildItineraryHandler(input) {
  const { city = 'Tokyo', days = 3, budgetTotalUSD, vibe = 'balanced' } = input ?? {};
  const candidateHotels = HOTELS.filter((h) => h.city.toLowerCase() === String(city).toLowerCase());
  if (candidateHotels.length === 0) return { error: 'no hotels found in city', city };
  // Hotel pick: respect budget if given (assume hotel takes ~60% of budget).
  const hotelBudget = budgetTotalUSD ? (budgetTotalUSD * 0.6) / days : Infinity;
  const hotel =
    vibe === 'luxury'
      ? candidateHotels.sort((a, b) => b.starRating - a.starRating)[0]
      : vibe === 'budget'
        ? candidateHotels.sort((a, b) => a.nightlyUSD - b.nightlyUSD)[0]
        : candidateHotels.find((h) => h.nightlyUSD <= hotelBudget) ?? candidateHotels[0];

  // Activity selection: one per day, rotate categories for variety.
  const acts = ACTIVITIES.filter((a) => a.city.toLowerCase() === String(city).toLowerCase())
    .sort((a, b) => b.rating - a.rating);
  const itinerary = [];
  for (let d = 0; d < days; d++) {
    const a = acts[d % acts.length];
    itinerary.push({
      day: d + 1,
      activity: a ? { id: a.id, name: a.name, category: a.category, durationHours: a.durationHours, priceUSD: a.priceUSD } : null,
      hotel: { id: hotel.id, name: hotel.name, nightlyUSD: hotel.nightlyUSD },
    });
  }
  const totalHotel = hotel.nightlyUSD * days;
  const totalActivities = itinerary.reduce((s, d) => s + (d.activity?.priceUSD ?? 0), 0);
  return {
    city,
    days,
    vibe,
    hotel,
    itinerary,
    totals: {
      hotelUSD: totalHotel,
      activitiesUSD: totalActivities,
      totalUSD: totalHotel + totalActivities,
      withinBudget: budgetTotalUSD ? totalHotel + totalActivities <= budgetTotalUSD : null,
    },
  };
}

const app = await defineSubAgent({
  name: 'trip-planner',
  version: '1.0.0',
  description: 'Composes multi-day Expedia itineraries from inventory.',
  whenToUse: 'when the user asks for a multi-day itinerary or "plan me X days in Y".',
  skills: [
    {
      descriptor: {
        name: 'build-itinerary',
        version: '1.0.0',
        description: 'Build a day-by-day itinerary with hotel + activities for a city.',
        whenToUse: 'when the parent delegates multi-day, multi-vertical planning to this sub-agent.',
        kind: 'in-process',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            days: { type: 'number', minimum: 1, maximum: 14, default: 3 },
            budgetTotalUSD: { type: 'number' },
            vibe: { type: 'string', enum: ['budget', 'balanced', 'luxury'], default: 'balanced' },
          },
        },
      },
      handler: buildItineraryHandler,
    },
  ],
});

await app.start({ port: 8082 });
console.log('[trip-planner] ready on :8082 (federate endpoint at http://localhost:8082/federate)');

const shutdown = async (sig) => {
  console.log(`\n[trip-planner] caught ${sig}, shutting down...`);
  await app.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
