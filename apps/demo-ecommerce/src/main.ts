/**
 * E-commerce demo — host page for the SaaSAgent shell.
 *
 * Demonstrates:
 *   • Catalog + cart UI annotated with data-saas-agent-observe regions so the
 *     runtime's DOM observer picks up mutations as the user interacts.
 *   • saasagent:event semantic events dispatched on add-to-cart so the
 *     planner gets explicit ambient signals.
 *   • A `.feature.md`-style domain context POSTed into the runtime on first
 *     load so the planner has e-commerce conventions in scope.
 *   • A "fetch-product" tool registered against a local stub endpoint so the
 *     planner can look up product details on demand.
 */

import '@saasagent/web-shell';

interface Product {
  id: string;
  name: string;
  price: number;
  brand: string;
  category: string;
}

const PRODUCTS: Product[] = [
  { id: 'tv-55', name: 'Sony Bravia 55"', price: 749, brand: 'Sony', category: '4k-tv' },
  { id: 'tv-65', name: 'Sony Bravia 65"', price: 1199, brand: 'Sony', category: '4k-tv' },
  { id: 'lg-c3', name: 'LG C3 OLED 55"', price: 1399, brand: 'LG', category: 'oled-tv' },
  { id: 'samsung-q60', name: 'Samsung Q60C 50"', price: 549, brand: 'Samsung', category: '4k-tv' },
  { id: 'hisense-u8', name: 'Hisense U8K 65"', price: 999, brand: 'Hisense', category: 'mini-led-tv' },
  { id: 'tcl-q7', name: 'TCL Q7 75"', price: 899, brand: 'TCL', category: '4k-tv' },
];

const cart = new Map<string, { product: Product; qty: number }>();

function renderProducts(): void {
  const grid = document.getElementById('product-grid')!;
  grid.innerHTML = PRODUCTS.map((p) => `
    <div class="product" data-product-id="${p.id}">
      <div class="name">${p.name}</div>
      <div class="price">$${p.price.toFixed(2)}</div>
      <div style="font-size: 12px; color: var(--muted);">${p.brand} · ${p.category}</div>
      <button data-add="${p.id}">Add to cart</button>
    </div>
  `).join('');
  grid.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const productId = target.dataset.add;
    if (productId) addToCart(productId);
  });
}

function addToCart(productId: string): void {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  const existing = cart.get(productId);
  if (existing) existing.qty += 1;
  else cart.set(productId, { product, qty: 1 });
  renderCart();
  // Dispatch a semantic event the SaaSAgent DOM observer relays to the runtime.
  document.dispatchEvent(
    new CustomEvent('saasagent:event', {
      detail: {
        kind: 'cart-item-added',
        payload: {
          productId: product.id,
          name: product.name,
          price: product.price,
          totalItems: [...cart.values()].reduce((s, c) => s + c.qty, 0),
          totalUSD: [...cart.values()].reduce((s, c) => s + c.qty * c.product.price, 0),
        },
      },
    }),
  );
}

function renderCart(): void {
  const itemsEl = document.getElementById('cart-items')!;
  if (cart.size === 0) {
    itemsEl.textContent = 'empty';
  } else {
    const lines = [...cart.values()].map(
      (c) => `${c.qty}× ${c.product.name} ($${(c.qty * c.product.price).toFixed(2)})`,
    );
    itemsEl.textContent = lines.join(' · ');
  }
  const summary = document.querySelector('[data-saas-agent-observe="cart-summary"]')!;
  const totalItems = [...cart.values()].reduce((s, c) => s + c.qty, 0);
  const totalUSD = [...cart.values()].reduce((s, c) => s + c.qty * c.product.price, 0);
  summary.textContent = `Cart: ${totalItems} items, $${totalUSD.toFixed(2)}`;
}

async function seedRuntime(runtimeUrl: string): Promise<void> {
  // Register a checkout feature so the planner has e-commerce domain context.
  try {
    const featureMd = `---
name: ecommerce-checkout
version: 1.0.0
summary: Cart-to-purchase flow conventions for this storefront.
whenRelevant: |
  Use whenever the user asks about pricing, comparisons, the cart, or checkout.
ownerTeam: storefront
tags: [shopping, cart, checkout]
---

# Checkout flow

The storefront supports the following:

- Cart auto-saves; users can return without losing items.
- Payment methods: credit card, PayPal, Apple Pay.
- Free shipping on orders ≥ $500. Standard 5–7 days; express 2 days for $14.99.
- Returns accepted within 30 days, original packaging required for unboxed TVs.
- Bundle discount: 5% off when buying ≥ 2 TVs in one order.

When the user says "compare" — fetch product details for both items and emit a side-by-side
Card with price + brand + category. Highlight the bundle discount if applicable.
`;
    await fetch(`${runtimeUrl}/registry/features?format=markdown`, {
      method: 'PUT',
      headers: { 'content-type': 'text/markdown' },
      body: featureMd,
    });
  } catch (err) {
    console.warn('[demo-ecommerce] could not seed feature:', err);
  }

  // Register a fetch-product tool. For demo it points at a local stub endpoint
  // (this same dev server) — see the static catalog.json below.
  try {
    const tool = {
      name: 'fetch-product',
      version: '1.0.0',
      description: 'Look up live catalog details for a product ID',
      whenToUse: 'when the user asks about a specific product by id (tv-55, lg-c3, etc.)',
      method: 'GET' as const,
      urlTemplate: `${window.location.origin}/catalog.json?id={productId}`,
    };
    await fetch(`${runtimeUrl}/registry/tools`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tool),
    });
  } catch (err) {
    console.warn('[demo-ecommerce] could not seed tool:', err);
  }
}

// Boot
renderProducts();
renderCart();
const runtime = document.querySelector('saas-agent')?.getAttribute('runtime') ?? 'http://localhost:8080';
void seedRuntime(runtime);
console.log('[demo-ecommerce] booted; runtime =', runtime);
