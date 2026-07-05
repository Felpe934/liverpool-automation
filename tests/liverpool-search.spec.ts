import { test, expect } from './fixtures';
import type { Page, Locator } from '@playwright/test';
import { gotoWithHydrationRetry } from './utils/navigation';
import { interceptSearchResponse, crossValidate } from './utils/api-validation';
import type { UIProduct } from './utils/api-validation';

const BASE_URL = 'https://www.liverpool.com.mx/tienda/home';
const SEARCH_TERM = 'playstation 5';
const COLOR_FILTER = 'Blanco';

async function acceptCookiesIfPresent(page: Page) {
  const cookieBtn = page.locator('button:has-text("Aceptar")').first();
  if (await cookieBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cookieBtn.click();
  }
}

async function searchProduct(page: Page, term: string) {
  const searchInput = page
    .locator('[data-testid="blt26617d4f2e17657d-header-search-input"]:visible')
    .first();

  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill(term);
  await searchInput.press('Enter');
  await page.waitForLoadState('domcontentloaded');
}

async function filterByColor(page: Page, color: string) {
  const colorBtn = page.getByRole('button', { name: color });
  await colorBtn.waitFor({ state: 'visible', timeout: 15000 });
  await colorBtn.click();
  await page.waitForTimeout(2000);
}

async function sortByLowestPrice(page: Page) {
  const sortBtn = page.getByTestId('dropdown-sorting-button');
  await sortBtn.waitFor({ state: 'visible', timeout: 15000 });
  await sortBtn.click();

  const lowestPriceOption = page.getByRole('option', { name: 'Menor precio' });
  await lowestPriceOption.waitFor({ state: 'visible', timeout: 10000 });
  await lowestPriceOption.click();
  await page.waitForTimeout(2000);
}

async function extractPrice(card: Locator): Promise<string> {
  const priceContainer = card.locator('[data-testid$="-price"]').first();

  const discounted = priceContainer.locator('[data-testid="discounted"]');
  if ((await discounted.count()) > 0) {
    const text = (await discounted.textContent())?.trim() ?? '';
    return normalizePrice(text);
  }

  const text = (await priceContainer.textContent())?.trim() ?? '';
  return normalizePrice(text);
}

function normalizePrice(raw: string): string {
  const match = raw.match(/\$[\d,]+(\.\d{2})?/);
  const cleaned = match ? match[0].replace(/,/g, '') : raw;
  // aseguramos formato "$X.YY"
  const numMatch = cleaned.match(/[\d.]+/);
  if (!numMatch) return cleaned;
  return `$${parseFloat(numMatch[0]).toFixed(2)}`;
}

async function extractFirstNProducts(page: Page, n: number): Promise<UIProduct[]> {
  const cards = page.locator('a[data-testid$="-card-card-link"]');
  await cards.first().waitFor({ state: 'visible', timeout: 15000 });

  const count = await cards.count();
  const total = Math.min(n, count);
  const products: UIProduct[] = [];

  for (let i = 0; i < total; i++) {
    const card = cards.nth(i);
    const name = (await card.locator('h3').first().textContent())?.trim() ?? '';
    const price = await extractPrice(card);
    products.push({ name, price });
  }

  return products;
}

test('Buscar Playstation 5, filtrar por Blanco, ordenar por menor precio y validar contra API', async ({
  page,
}) => {
  await gotoWithHydrationRetry(page, BASE_URL);
  await acceptCookiesIfPresent(page);
  await searchProduct(page, SEARCH_TERM);
  await filterByColor(page, COLOR_FILTER);

  // Empezamos a escuchar la respuesta de red ANTES de ordenar,
  // porque el sort dispara la llamada que trae los resultados ordenados.
  const searchResponsePromise = interceptSearchResponse(page);

  await sortByLowestPrice(page);

  const apiProducts = await searchResponsePromise;
  const uiProducts = await extractFirstNProducts(page, 5);

  console.log('--- PRIMEROS 5 RESULTADOS (UI) ---');
  uiProducts.forEach((p, i) => console.log(`${i + 1}. ${p.name} - ${p.price}`));

  console.log(`\n--- PRODUCTOS EN RESPUESTA DE RED: ${apiProducts.length} ---`);

  const validation = crossValidate(uiProducts, apiProducts);

  console.log(`\n--- VALIDACIÓN CRUZADA ---`);
  console.log(`Coincidencias: ${validation.matched}/${validation.total}`);

  if (validation.discrepancies.length > 0) {
    console.log('Discrepancias encontradas:');
    validation.discrepancies.forEach((d) => console.log(`  - ${d}`));
  } else {
    console.log('Sin discrepancias.');
  }

  expect(uiProducts.length).toBeGreaterThan(0);
  expect(uiProducts.length).toBeLessThanOrEqual(5);
  expect(validation.matched).toBeGreaterThanOrEqual(3);
});