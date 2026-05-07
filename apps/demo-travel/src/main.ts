/**
 * Travel demo — host page for the SaaSAgent shell.
 *
 * Demonstrates:
 *   • Multi-leg flight result cards annotated with data-saas-agent-observe.
 *   • saasagent:event semantic events dispatched on flight-selected,
 *     search-changed, etc.
 *   • A `.feature.md` describing multi-leg trip rules POSTed into the runtime
 *     on first load so the planner can ground its responses.
 *   • A "search-flights" tool registered for the planner to call directly.
 */

import '@saasagent/web-shell';

interface Flight {
  id: string;
  airline: string;
  from: string;
  to: string;
  via?: string;
  durationHrs: number;
  layoverHrs: number;
  priceUSD: number;
  alliance: 'Star' | 'OneWorld' | 'SkyTeam' | 'none';
}

const FLIGHTS: Flight[] = [
  { id: 'ua-837', airline: 'United', from: 'SFO', to: 'NRT', durationHrs: 11, layoverHrs: 0, priceUSD: 1280, alliance: 'Star' },
  { id: 'ja-002', airline: 'JAL', from: 'SFO', to: 'NRT', durationHrs: 11, layoverHrs: 0, priceUSD: 1340, alliance: 'OneWorld' },
  { id: 'ana-cone', airline: 'ANA via HNL', from: 'SFO', to: 'NRT', via: 'HNL', durationHrs: 18, layoverHrs: 5, priceUSD: 870, alliance: 'Star' },
  { id: 'sk-bkk', airline: 'Singapore via ICN', from: 'SFO', to: 'NRT', via: 'ICN', durationHrs: 22, layoverHrs: 9, priceUSD: 760, alliance: 'Star' },
  { id: 'koreanair-conn', airline: 'Korean Air via ICN', from: 'SFO', to: 'NRT', via: 'ICN', durationHrs: 17, layoverHrs: 4, priceUSD: 950, alliance: 'SkyTeam' },
];

function renderFlights(filter?: { from?: string; to?: string }): void {
  const list = document.getElementById('flight-results')!;
  const matched = FLIGHTS.filter((f) => {
    if (filter?.from && f.from !== filter.from) return false;
    if (filter?.to && f.to !== filter.to) return false;
    return true;
  });
  list.innerHTML = matched.length
    ? matched.map((f) => `
      <div class="flight" data-saas-agent-track-viewport="flight-${f.id}" data-flight-id="${f.id}">
        <div>
          <div class="route">${f.from} → ${f.via ? `${f.via} → ` : ''}${f.to}</div>
          <div class="stops">${f.airline} · ${f.alliance} alliance · ${f.via ? `${f.layoverHrs}h layover` : 'nonstop'}</div>
        </div>
        <div>${f.durationHrs}h total</div>
        <div class="price">$${f.priceUSD.toFixed(0)}</div>
        <button data-select="${f.id}">Select</button>
      </div>
    `).join('')
    : '<p style="color: var(--muted)">No matching flights — try a different search.</p>';
  list.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const id = target.dataset.select;
    if (id) selectFlight(id);
  });
  // Update header summary
  document.querySelector('[data-saas-agent-observe="search-summary"]')!.textContent =
    `Search: ${filter?.from ?? 'SFO'} → ${filter?.to ?? 'NRT'} (${matched.length} flights)`;
}

function selectFlight(id: string): void {
  const f = FLIGHTS.find((x) => x.id === id);
  if (!f) return;
  document.dispatchEvent(
    new CustomEvent('saasagent:event', {
      detail: {
        kind: 'flight-selected',
        payload: {
          flightId: f.id,
          airline: f.airline,
          route: `${f.from} → ${f.via ? `${f.via} → ` : ''}${f.to}`,
          priceUSD: f.priceUSD,
          durationHrs: f.durationHrs,
          layoverHrs: f.layoverHrs,
        },
      },
    }),
  );
  alert(`Selected ${f.airline} ${f.from}→${f.to} for $${f.priceUSD}.`);
}

function attachSearch(): void {
  document.getElementById('search')!.addEventListener('click', () => {
    const from = (document.getElementById('from') as HTMLInputElement).value.toUpperCase();
    const to = (document.getElementById('to') as HTMLInputElement).value.toUpperCase();
    renderFlights({ from, to });
    document.dispatchEvent(
      new CustomEvent('saasagent:event', {
        detail: { kind: 'search-changed', payload: { from, to } },
      }),
    );
  });
}

async function seedRuntime(runtimeUrl: string): Promise<void> {
  try {
    const featureMd = `---
name: travel-multi-leg
version: 1.0.0
summary: Multi-leg trip planning rules — layovers, baggage, alliances, visas.
whenRelevant: |
  Use when the user asks about flights, layovers, connections, baggage, visas,
  or anything about choosing between trip options.
ownerTeam: travel-discovery
tags: [booking, multi-leg, visa]
---

# Multi-leg trip planning

The booking flow handles trips with up to 4 legs. Constraints:

- **Layover minimum** 60 minutes for same-airline transfers, 90 minutes cross-airline.
- **Baggage transfer** is automatic for same-alliance flights; manual recheck across alliances.
- **Visa hints** surface when any leg includes a country requiring a visa for the user's nationality.
- **Price-band guidance**: cheapest options usually involve >12h layovers — flag clearly when chosen.
- **Alliance hierarchy**: Star Alliance, OneWorld, SkyTeam are the three majors. Cross-alliance trips
  often cost more but offer more route choices.

When the user says "compare these two flights" — fetch both flights' data and emit a side-by-side
comparison Card with price + duration + layover + alliance + a recommendation that highlights any
strict layover violations.
`;
    await fetch(`${runtimeUrl}/registry/features?format=markdown`, {
      method: 'PUT',
      headers: { 'content-type': 'text/markdown' },
      body: featureMd,
    });
  } catch (err) {
    console.warn('[demo-travel] could not seed feature:', err);
  }
}

// Boot
attachSearch();
renderFlights();
const runtime = document.querySelector('saas-agent')?.getAttribute('runtime') ?? 'http://localhost:8080';
void seedRuntime(runtime);
console.log('[demo-travel] booted; runtime =', runtime);
