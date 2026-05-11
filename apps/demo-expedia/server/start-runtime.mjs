/**
 * Expedia-customized SaaSAgent runtime.
 *
 * This is the file an Expedia enterprise developer writes to bring up the
 * agent in their data plane. It:
 *   1. Imports the generic @saasagent/runtime.
 *   2. Registers in-process SKILL handlers for Expedia's verticals
 *      (search-flights, search-hotels, find-things-to-do, compare-flights).
 *   3. Registers a SUB-AGENT descriptor pointing at the trip-planner runtime
 *      (which an Expedia trip-planning team owns separately, federated via
 *      the symmetric /federate contract — see ADR-021, P-003).
 *   4. Starts on :8080. The shell connects here over SSE + WS.
 *
 * Run with:
 *   ANTHROPIC_API_KEY=... node apps/demo-expedia/server/start-runtime.mjs
 *
 * The shell HTML embeds <saas-agent runtime="http://localhost:8080"> so once
 * this is up the planner can reach any of the registered Expedia capabilities.
 */

import { Runtime } from '@saasagent/runtime';

// ---------- In-memory Expedia inventory (mirrors apps/demo-expedia/src/data.ts) ----------

const FLIGHTS = [
  { id: 'fl-001', airline: 'United', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '11:30', arriveTime: '15:20+1', durationMin: 670, stops: 0, priceUSD: 892, cabin: 'economy' },
  { id: 'fl-002', airline: 'ANA', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '13:00', arriveTime: '17:00+1', durationMin: 685, stops: 0, priceUSD: 1024, cabin: 'economy' },
  { id: 'fl-003', airline: 'JAL', origin: 'SFO', destination: 'HND', departDate: '2026-08-15', departTime: '14:25', arriveTime: '18:30+1', durationMin: 695, stops: 0, priceUSD: 978, cabin: 'economy' },
  { id: 'fl-004', airline: 'Delta', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '08:15', arriveTime: '17:05+1', durationMin: 815, stops: 1, priceUSD: 712, cabin: 'economy' },
  { id: 'fl-005', airline: 'United', origin: 'SFO', destination: 'NRT', departDate: '2026-08-15', departTime: '22:45', arriveTime: '04:30+2', durationMin: 705, stops: 0, priceUSD: 2890, cabin: 'business' },
  { id: 'fl-006', airline: 'American', origin: 'JFK', destination: 'LHR', departDate: '2026-08-15', departTime: '19:00', arriveTime: '07:10+1', durationMin: 430, stops: 0, priceUSD: 645, cabin: 'economy' },
];

const HOTELS = [
  { id: 'ho-001', name: 'Park Hyatt Tokyo', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 5, guestRating: 4.8, nightlyUSD: 612, amenities: ['pool', 'spa', 'gym', 'wifi', 'breakfast'] },
  { id: 'ho-002', name: 'Aman Tokyo', city: 'Tokyo', neighborhood: 'Otemachi', starRating: 5, guestRating: 4.9, nightlyUSD: 1450, amenities: ['pool', 'spa', 'gym', 'wifi', 'breakfast', 'butler'] },
  { id: 'ho-003', name: 'Hotel Gracery Shinjuku', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 4, guestRating: 4.4, nightlyUSD: 178, amenities: ['wifi', 'breakfast'] },
  { id: 'ho-004', name: 'Citadines Central Shinjuku', city: 'Tokyo', neighborhood: 'Shinjuku', starRating: 4, guestRating: 4.3, nightlyUSD: 145, amenities: ['wifi', 'kitchenette'] },
  { id: 'ho-005', name: 'Andaz Tokyo Toranomon Hills', city: 'Tokyo', neighborhood: 'Toranomon', starRating: 5, guestRating: 4.7, nightlyUSD: 538, amenities: ['pool', 'spa', 'gym', 'wifi'] },
  { id: 'ho-006', name: 'The Standard London', city: 'London', neighborhood: 'Kings Cross', starRating: 4, guestRating: 4.6, nightlyUSD: 412, amenities: ['gym', 'wifi', 'breakfast'] },
];

const ACTIVITIES = [
  { id: 'ac-001', name: 'TeamLab Planets immersive art', city: 'Tokyo', category: 'museum', durationHours: 2, priceUSD: 38, rating: 4.8 },
  { id: 'ac-002', name: 'Tsukiji outer-market food tour', city: 'Tokyo', category: 'food', durationHours: 3, priceUSD: 95, rating: 4.9 },
  { id: 'ac-003', name: 'Mt. Fuji + Hakone day trip', city: 'Tokyo', category: 'outdoor', durationHours: 11, priceUSD: 145, rating: 4.6 },
  { id: 'ac-004', name: 'Robot Restaurant successor show', city: 'Tokyo', category: 'show', durationHours: 1.5, priceUSD: 88, rating: 4.3 },
  { id: 'ac-005', name: 'Shibuya guided night walk', city: 'Tokyo', category: 'tour', durationHours: 2.5, priceUSD: 52, rating: 4.7 },
];

// ---------- Skill handlers ----------

/** expedia.search-flights — searches the flight catalog by origin/destination/cabin/max price. */
async function searchFlightsHandler(input) {
  const { origin, destination, cabin = 'economy', maxPriceUSD, sortBy = 'price' } = input ?? {};
  let results = FLIGHTS.filter((f) =>
    (!origin || f.origin === origin.toUpperCase()) &&
    (!destination || f.destination === destination.toUpperCase()) &&
    (!cabin || f.cabin === cabin) &&
    (!maxPriceUSD || f.priceUSD <= maxPriceUSD),
  );
  if (sortBy === 'price') results = results.sort((a, b) => a.priceUSD - b.priceUSD);
  else if (sortBy === 'duration') results = results.sort((a, b) => a.durationMin - b.durationMin);
  return { count: results.length, flights: results };
}

/** expedia.search-hotels — searches the hotel catalog by city + price range + min stars. */
async function searchHotelsHandler(input) {
  const { city, maxNightlyUSD, minStarRating } = input ?? {};
  const results = HOTELS.filter((h) =>
    (!city || h.city.toLowerCase() === String(city).toLowerCase()) &&
    (!maxNightlyUSD || h.nightlyUSD <= maxNightlyUSD) &&
    (!minStarRating || h.starRating >= minStarRating),
  ).sort((a, b) => b.guestRating - a.guestRating);
  return { count: results.length, hotels: results };
}

/** expedia.find-things-to-do — filters activity catalog. */
async function findThingsToDoHandler(input) {
  const { city, category, maxPriceUSD } = input ?? {};
  const results = ACTIVITIES.filter((a) =>
    (!city || a.city.toLowerCase() === String(city).toLowerCase()) &&
    (!category || a.category === category) &&
    (!maxPriceUSD || a.priceUSD <= maxPriceUSD),
  ).sort((a, b) => b.rating - a.rating);
  return { count: results.length, activities: results };
}

/** expedia.compare-flights — side-by-side comparator for two flights by id. */
async function compareFlightsHandler(input) {
  const { flightIdA, flightIdB } = input ?? {};
  const a = FLIGHTS.find((f) => f.id === flightIdA);
  const b = FLIGHTS.find((f) => f.id === flightIdB);
  if (!a || !b) return { error: 'one or both flight ids not found', flightIdA, flightIdB };
  return {
    flightA: a,
    flightB: b,
    priceDeltaUSD: b.priceUSD - a.priceUSD,
    durationDeltaMin: b.durationMin - a.durationMin,
    stopsDelta: b.stops - a.stops,
    recommendation:
      a.priceUSD < b.priceUSD && a.stops <= b.stops
        ? `${a.airline} (${a.id}) is both cheaper and equal-or-better on stops.`
        : b.priceUSD < a.priceUSD && b.stops <= a.stops
          ? `${b.airline} (${b.id}) is both cheaper and equal-or-better on stops.`
          : `Trade-off: ${a.id} is $${Math.abs(a.priceUSD - b.priceUSD)} ${a.priceUSD < b.priceUSD ? 'cheaper' : 'more expensive'}.`,
  };
}

/** expedia.estimate-trip-cost — sums flight + hotel*nights + activities. */
async function estimateTripCostHandler(input) {
  const { flightId, hotelId, nights = 1, activityIds = [] } = input ?? {};
  const f = flightId ? FLIGHTS.find((x) => x.id === flightId) : null;
  const h = hotelId ? HOTELS.find((x) => x.id === hotelId) : null;
  const acts = (activityIds ?? []).map((id) => ACTIVITIES.find((a) => a.id === id)).filter(Boolean);
  const flightCost = f ? f.priceUSD : 0;
  const hotelCost = h ? h.nightlyUSD * nights : 0;
  const activityCost = acts.reduce((s, a) => s + a.priceUSD, 0);
  return {
    flightCost,
    hotelCost,
    activityCost,
    totalUSD: flightCost + hotelCost + activityCost,
    breakdown: {
      flight: f ? `${f.airline} ${f.origin}→${f.destination} ${f.cabin}` : null,
      hotel: h ? `${h.name} × ${nights} nights` : null,
      activities: acts.map((a) => a.name),
    },
  };
}

// ---------- Skill descriptors (planner sees these in its tool list) ----------

const SKILLS = [
  {
    name: 'expedia.search-flights',
    version: '1.0.0',
    description: 'Search Expedia flight inventory by origin/destination/cabin/price.',
    whenToUse: 'when the user wants to find a flight by IATA codes, dates, or price/cabin filters.',
    kind: 'in-process',
    inputSchema: {
      type: 'object',
      properties: {
        origin: { type: 'string', description: '3-letter IATA origin (uppercase).' },
        destination: { type: 'string', description: '3-letter IATA destination (uppercase).' },
        cabin: { type: 'string', enum: ['economy', 'premium-economy', 'business', 'first'], default: 'economy' },
        maxPriceUSD: { type: 'number' },
        sortBy: { type: 'string', enum: ['price', 'duration'], default: 'price' },
      },
    },
  },
  {
    name: 'expedia.search-hotels',
    version: '1.0.0',
    description: 'Search Expedia hotel inventory by city / price ceiling / minimum star rating.',
    whenToUse: 'when the user wants a hotel in a specific city, or filtered by stars/price.',
    kind: 'in-process',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        maxNightlyUSD: { type: 'number' },
        minStarRating: { type: 'number', minimum: 1, maximum: 5 },
      },
    },
  },
  {
    name: 'expedia.find-things-to-do',
    version: '1.0.0',
    description: 'Find activities / experiences in a city, optionally filtered by category and price.',
    whenToUse: 'when the user asks "what should I do in X" or wants tours, food, museums, etc.',
    kind: 'in-process',
    inputSchema: {
      type: 'object',
      properties: {
        city: { type: 'string' },
        category: { type: 'string', enum: ['tour', 'food', 'museum', 'outdoor', 'show'] },
        maxPriceUSD: { type: 'number' },
      },
    },
  },
  {
    name: 'expedia.compare-flights',
    version: '1.0.0',
    description: 'Compare two specific flights side-by-side with a recommendation.',
    whenToUse: 'when the user wants to compare two flights they have in mind (by id) on price, duration, stops.',
    kind: 'in-process',
    inputSchema: {
      type: 'object',
      properties: {
        flightIdA: { type: 'string' },
        flightIdB: { type: 'string' },
      },
      required: ['flightIdA', 'flightIdB'],
    },
  },
  {
    name: 'expedia.estimate-trip-cost',
    version: '1.0.0',
    description: 'Estimate total trip cost given a selected flight, hotel + nights, and activities.',
    whenToUse: 'when the user has shortlisted items and wants a total / "what would this trip cost".',
    kind: 'in-process',
    inputSchema: {
      type: 'object',
      properties: {
        flightId: { type: 'string' },
        hotelId: { type: 'string' },
        nights: { type: 'number', minimum: 1, default: 1 },
        activityIds: { type: 'array', items: { type: 'string' } },
      },
    },
  },
];

// ---------- Sub-agent descriptor ----------

const TRIP_PLANNER_SUBAGENT = {
  name: 'trip-planner',
  version: '1.0.0',
  description: 'Multi-day, multi-vertical itinerary builder. Composes a day-by-day plan from inventory.',
  whenToUse: 'when the user asks for a multi-day itinerary or "plan me X days in Y" — single-vertical lookups stay local.',
  transport: 'http',
  endpoint: 'http://localhost:8082/federate',
};

// ---------- Boot ----------

const port = Number(process.env.SAAS_AGENT_PORT ?? 8080);
const runtime = new Runtime({ port });

// Register skills + their handlers BEFORE start() so the planner sees them
// from the very first plan call.
runtime.skillRegistry.replace(SKILLS);
runtime.skillExecutor.registerHandler('expedia.search-flights', searchFlightsHandler);
runtime.skillExecutor.registerHandler('expedia.search-hotels', searchHotelsHandler);
runtime.skillExecutor.registerHandler('expedia.find-things-to-do', findThingsToDoHandler);
runtime.skillExecutor.registerHandler('expedia.compare-flights', compareFlightsHandler);
runtime.skillExecutor.registerHandler('expedia.estimate-trip-cost', estimateTripCostHandler);

// Register the trip-planner sub-agent. The runtime will POST FederationRequests
// to its /federate endpoint when the planner picks subagent__trip-planner.
runtime.subAgentRegistry.replace([TRIP_PLANNER_SUBAGENT]);

await runtime.start();

console.log(`[expedia-runtime] ready on :${port}`);
console.log(`  • skills: ${SKILLS.map((s) => s.name).join(', ')}`);
console.log(`  • sub-agents: ${TRIP_PLANNER_SUBAGENT.name} → ${TRIP_PLANNER_SUBAGENT.endpoint}`);

const shutdown = async (sig) => {
  console.log(`\n[expedia-runtime] caught ${sig}, shutting down...`);
  await runtime.stop();
  process.exit(0);
};
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
