/**
 * Expedia demo — host page logic.
 *
 * This is the reference for "what an enterprise integrator drops into their
 * SaaS app." Responsibilities here:
 *   • Render flight / hotel / activity inventory and respond to user actions.
 *   • Tag observable regions with data-saas-agent-observe so the runtime's
 *     DOM observer relays mutations + visibility back to the planner.
 *   • Dispatch saasagent:event CustomEvents on semantic moments (flight-viewed,
 *     hotel-shortlisted, etc.) so the planner sees rich domain context, not
 *     just raw DOM diffs.
 *   • On boot, push Expedia-specific FEATURE descriptors + TOOL descriptors
 *     into the runtime via /registry REST endpoints — this is how a SaaS
 *     enterprise dev customizes the runtime for their domain. The runtime
 *     itself is generic; this code is what makes it "the Expedia agent".
 */

import '@saasagent/web-shell';
import { FLIGHTS, HOTELS, ACTIVITIES, type Flight, type Hotel, type Activity } from './data.js';

type Tab = 'flights' | 'hotels' | 'activities';
let activeTab: Tab = 'flights';
let shortlist: Array<{ kind: string; id: string; label: string }> = [];

// ---------- Rendering ----------

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function renderFlights(list: Flight[]): void {
  const el = document.getElementById('flight-results')!;
  if (list.length === 0) { el.innerHTML = '<div class="empty">No flights match — adjust your search.</div>'; return; }
  el.innerHTML = list.map((f) => `
    <div class="flight" data-flight-id="${f.id}">
      <div class="airline">${f.airline}</div>
      <div>
        <div class="route">${f.origin} → ${f.destination}</div>
        <div class="stops">${f.stops === 0 ? 'Nonstop' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`} · ${f.cabin}</div>
      </div>
      <div>
        <div>${f.departTime} – ${f.arriveTime}</div>
        <div class="duration">${fmtDuration(f.durationMin)}</div>
      </div>
      <div></div>
      <div class="price">$${f.priceUSD.toLocaleString()}<small>per traveler</small></div>
    </div>
  `).join('');
  el.querySelectorAll('.flight').forEach((row) => {
    row.addEventListener('click', () => {
      const id = (row as HTMLElement).dataset.flightId!;
      const f = FLIGHTS.find((x) => x.id === id)!;
      shortlist.push({ kind: 'flight', id: f.id, label: `${f.airline} ${f.origin}→${f.destination} $${f.priceUSD}` });
      updateTripContext();
      dispatchSemantic('flight-shortlisted', { flightId: f.id, airline: f.airline, route: `${f.origin}-${f.destination}`, priceUSD: f.priceUSD, cabin: f.cabin, stops: f.stops });
    });
  });
}

function renderHotels(list: Hotel[]): void {
  const el = document.getElementById('hotel-results')!;
  if (list.length === 0) { el.innerHTML = '<div class="empty">No stays match — adjust your search.</div>'; return; }
  el.innerHTML = list.map((h) => `
    <div class="hotel" data-hotel-id="${h.id}">
      <div class="icon">${h.imageEmoji}</div>
      <div>
        <div class="name">${h.name}</div>
        <div class="meta">${h.neighborhood}, ${h.city} · ${'★'.repeat(h.starRating)} · <span class="rating">${h.guestRating}</span> guest rating</div>
        <div class="amenities">${h.amenities.map((a) => `<span>${a}</span>`).join('')}</div>
      </div>
      <div class="price">$${h.nightlyUSD}<small style="display:block;font-size:11px;color:var(--muted);font-weight:normal">/ night</small></div>
    </div>
  `).join('');
  el.querySelectorAll('.hotel').forEach((row) => {
    row.addEventListener('click', () => {
      const id = (row as HTMLElement).dataset.hotelId!;
      const h = HOTELS.find((x) => x.id === id)!;
      shortlist.push({ kind: 'hotel', id: h.id, label: `${h.name} $${h.nightlyUSD}/nt` });
      updateTripContext();
      dispatchSemantic('hotel-shortlisted', { hotelId: h.id, name: h.name, city: h.city, starRating: h.starRating, nightlyUSD: h.nightlyUSD });
    });
  });
}

function renderActivities(list: Activity[]): void {
  const el = document.getElementById('activity-results')!;
  if (list.length === 0) { el.innerHTML = '<div class="empty">No activities match.</div>'; return; }
  el.innerHTML = list.map((a) => `
    <div class="hotel" data-activity-id="${a.id}">
      <div class="icon">🎭</div>
      <div>
        <div class="name">${a.name}</div>
        <div class="meta">${a.city} · ${a.category} · ${a.durationHours}h · <span class="rating">${a.rating}</span></div>
      </div>
      <div class="price">$${a.priceUSD}</div>
    </div>
  `).join('');
  el.querySelectorAll('[data-activity-id]').forEach((row) => {
    row.addEventListener('click', () => {
      const id = (row as HTMLElement).dataset.activityId!;
      const a = ACTIVITIES.find((x) => x.id === id)!;
      shortlist.push({ kind: 'activity', id: a.id, label: `${a.name} $${a.priceUSD}` });
      updateTripContext();
      dispatchSemantic('activity-shortlisted', { activityId: a.id, name: a.name, city: a.city, category: a.category, priceUSD: a.priceUSD });
    });
  });
}

function updateTripContext(): void {
  const box = document.getElementById('trip-context')!;
  const body = document.getElementById('trip-context-body')!;
  if (shortlist.length === 0) { box.style.display = 'none'; return; }
  box.style.display = 'block';
  body.innerHTML = shortlist.map((s) => `<div>• ${s.kind}: ${s.label}</div>`).join('');
}

// ---------- Search filters ----------

function searchFlights(): void {
  const from = (document.getElementById('flight-from') as HTMLInputElement).value.toUpperCase();
  const to = (document.getElementById('flight-to') as HTMLInputElement).value.toUpperCase();
  const cabin = (document.getElementById('flight-cabin') as HTMLSelectElement).value;
  const results = FLIGHTS.filter((f) => f.origin === from && f.destination === to && f.cabin === cabin);
  (document.getElementById('flight-results-route') as HTMLElement).textContent = to;
  renderFlights(results);
  dispatchSemantic('flight-search-performed', { origin: from, destination: to, cabin, resultCount: results.length });
}

function searchHotels(): void {
  const city = (document.getElementById('hotel-city') as HTMLInputElement).value;
  const results = HOTELS.filter((h) => h.city.toLowerCase() === city.toLowerCase());
  (document.getElementById('hotel-results-city') as HTMLElement).textContent = city;
  renderHotels(results);
  dispatchSemantic('hotel-search-performed', { city, resultCount: results.length });
}

function searchActivities(): void {
  const city = (document.getElementById('activity-city') as HTMLInputElement).value;
  const cat = (document.getElementById('activity-cat') as HTMLSelectElement).value;
  const results = ACTIVITIES.filter((a) =>
    a.city.toLowerCase() === city.toLowerCase() && (cat === '' || a.category === cat),
  );
  (document.getElementById('activity-results-city') as HTMLElement).textContent = city;
  renderActivities(results);
  dispatchSemantic('activity-search-performed', { city, category: cat || 'all', resultCount: results.length });
}

// ---------- Tabs ----------

function showTab(tab: Tab): void {
  activeTab = tab;
  document.querySelectorAll<HTMLElement>('nav a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
  for (const t of ['flights', 'hotels', 'activities'] as Tab[]) {
    const panel = document.getElementById(`panel-${t}`)!;
    panel.style.display = t === tab ? 'block' : 'none';
  }
  const title = document.getElementById('page-title')!;
  title.textContent = tab === 'flights' ? 'Find your flight' : tab === 'hotels' ? 'Find your stay' : 'Things to do';
  dispatchSemantic('tab-changed', { tab });
}

// ---------- Semantic event helper ----------

function dispatchSemantic(kind: string, payload: Record<string, unknown>): void {
  document.dispatchEvent(new CustomEvent('saasagent:event', { detail: { kind, payload } }));
}

// ---------- Runtime customization (this is what makes the generic runtime "the Expedia agent") ----------

async function seedRuntime(runtimeUrl: string): Promise<void> {
  // 1) Domain feature: planner reads this as super-skill context to understand
  //    Expedia's product surface and conventions.
  const featureMd = `---
name: expedia-product
version: 1.0.0
summary: Expedia's flights + stays + things-to-do product surface and trip conventions.
whenRelevant: |
  Use whenever the user mentions travel, flights, hotels, stays, activities,
  destinations, trip planning, or specific cities / airports.
ownerTeam: trip-experience
tags: [travel, flights, hotels, activities, trip-planning]
---

# Expedia product surface

The site has three primary verticals:

- **Flights** — search by origin/destination IATA codes + date + cabin class. Results show airline, route, departure/arrival times, duration, stops, and per-traveler price. Direct routes are marked "Nonstop"; 1+ stop routes show stop count.
- **Stays** (hotels) — search by city + check-in/out dates + guest count. Results show name, neighborhood, star rating, guest rating (out of 5), nightly USD price, and amenity tags (pool, spa, gym, wifi, breakfast, butler, kitchenette).
- **Things to do** (activities) — search by city + optional category (tour / food / museum / outdoor / show). Results show name, duration in hours, price, and rating.

## Conventions

- All prices are in USD per traveler / per night / per ticket respectively.
- IATA airport codes are uppercase 3-letter (SFO, NRT, LHR, HND, JFK).
- When the user shortlists items (clicks a flight or hotel) they accumulate
  into a "trip in progress" panel at the top of main.
- The user is logged in (the "Welcome back — view trips" header element).
- "Business class" and "Premium economy" are valid cabin classes; default is economy.

## Trip-planning escalation

For complex multi-day itinerary requests ("plan me 4 days in Tokyo") the parent
runtime should delegate to the **trip-planner** sub-agent, which has the
\`build-itinerary\` skill scoped to multi-day, multi-vertical synthesis. Single-
vertical lookups stay local.

## Pricing guidance

- Bundle savings: when the user shortlists a flight + a hotel for overlapping
  dates, mention "package savings up to 15%".
- For business class queries, mention award-mile redemption as an option if the
  user has a frequent-flyer number in memory (none in MVP).
`;

  try {
    const r = await fetch(`${runtimeUrl}/registry/features?format=markdown`, {
      method: 'PUT',
      headers: { 'content-type': 'text/markdown' },
      body: featureMd,
    });
    if (!r.ok) console.warn('[expedia] feature seed HTTP', r.status, await r.text());
  } catch (err) {
    console.warn('[expedia] feature seed failed:', err);
  }

  // 2) Tools pointing at the Expedia "backend" (this same Vite dev server, which
  //    serves the static mock JSON from /public). In production these would be
  //    Expedia's real microservices.
  const tools = [
    {
      name: 'expedia-fetch-flight',
      version: '1.0.0',
      description: 'Look up details + fare-class availability for a specific flight by ID.',
      whenToUse: 'when the user references a specific flight by id (e.g. fl-001) or asks for details on a result already shown.',
      method: 'GET' as const,
      urlTemplate: `${window.location.origin}/api/flights.json?id={flightId}`,
    },
    {
      name: 'expedia-fetch-hotel',
      version: '1.0.0',
      description: 'Look up details for a specific hotel by ID, including amenities and nightly rate.',
      whenToUse: 'when the user asks about a specific hotel by id (ho-001..) or about amenities of one already shown.',
      method: 'GET' as const,
      urlTemplate: `${window.location.origin}/api/hotels.json?id={hotelId}`,
    },
  ];
  for (const tool of tools) {
    try {
      const r = await fetch(`${runtimeUrl}/registry/tools`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(tool),
      });
      if (!r.ok) console.warn('[expedia] tool seed', tool.name, 'HTTP', r.status, await r.text());
    } catch (err) {
      console.warn('[expedia] tool seed failed:', tool.name, err);
    }
  }
}

// ---------- Wire up + boot ----------

function bindEvents(): void {
  document.getElementById('flight-search-btn')!.addEventListener('click', searchFlights);
  document.getElementById('hotel-search-btn')!.addEventListener('click', searchHotels);
  document.getElementById('activity-search-btn')!.addEventListener('click', searchActivities);
  document.querySelectorAll<HTMLElement>('nav a').forEach((a) => {
    a.addEventListener('click', () => showTab(a.dataset.tab as Tab));
  });
}

bindEvents();
searchFlights();
searchHotels();
searchActivities();

const runtime = document.querySelector('saas-agent')?.getAttribute('runtime') ?? 'http://localhost:8080';
void seedRuntime(runtime);
console.log('[demo-expedia] booted; runtime =', runtime, '; activeTab =', activeTab);
