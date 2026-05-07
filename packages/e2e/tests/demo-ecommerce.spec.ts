import { test, expect } from '@playwright/test';

/**
 * Smoke tests for the e-commerce demo vertical.
 *
 * Asserts:
 *   1. The shell mounts and renders the welcome layout.
 *   2. Clicking "Add to cart" updates the cart UI.
 *   3. Adding a product dispatches a saasagent:event semantic envelope.
 *
 * The DOM observer + runtime intercept paths are tested at the unit level
 * (web-shell + runtime packages) — these E2E tests focus on the visible
 * end-user behavior of the host page.
 */

test.describe('demo-ecommerce', () => {
  test('renders the catalog with 6 products + the agent shell', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.product')).toHaveCount(6);
    await expect(page.locator('saas-agent')).toBeVisible();
  });

  test('clicking Add to cart updates the cart summary', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cart-items')).toHaveText('empty');
    await page.locator('button[data-add="tv-55"]').click();
    await expect(page.locator('#cart-items')).toContainText('1× Sony Bravia 55"');
    await expect(page.locator('[data-saas-agent-observe="cart-summary"]')).toContainText('Cart: 1 items, $749.00');
  });

  test('Add to cart dispatches a saasagent:event semantic event', async ({ page }) => {
    await page.goto('/');
    // Capture saasagent:event detail.
    const eventDetail = await page.evaluate(() => {
      return new Promise<unknown>((resolve) => {
        const handler = (e: Event) => {
          document.removeEventListener('saasagent:event', handler);
          resolve((e as CustomEvent).detail);
        };
        document.addEventListener('saasagent:event', handler);
        (document.querySelector('button[data-add="lg-c3"]') as HTMLButtonElement).click();
      });
    });
    expect(eventDetail).toMatchObject({
      kind: 'cart-item-added',
      payload: { productId: 'lg-c3', name: 'LG C3 OLED 55"', price: 1399 },
    });
  });

  test('Adding two products updates totalItems + totalUSD in the semantic event', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[data-add="tv-55"]').click();
    const detail = await page.evaluate(() => {
      return new Promise<unknown>((resolve) => {
        const handler = (e: Event) => {
          document.removeEventListener('saasagent:event', handler);
          resolve((e as CustomEvent).detail);
        };
        document.addEventListener('saasagent:event', handler);
        (document.querySelector('button[data-add="hisense-u8"]') as HTMLButtonElement).click();
      });
    });
    expect(detail).toMatchObject({
      kind: 'cart-item-added',
      payload: { totalItems: 2, totalUSD: 1748 },
    });
  });

  test('cart-summary region carries the data-saas-agent-observe attribute', async ({ page }) => {
    await page.goto('/');
    const summary = page.locator('[data-saas-agent-observe="cart-summary"]');
    await expect(summary).toBeAttached();
    await expect(summary).toHaveAttribute('data-saas-agent-observe', 'cart-summary');
  });
});
