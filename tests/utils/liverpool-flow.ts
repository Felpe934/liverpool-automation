import { Page, Locator } from '@playwright/test';

export interface UIProduct {
  name: string;
  price: string;
}

export async function acceptCookiesIfPresent(page: Page): Promise<void> {
  const cookieBtn = page.locator('button:has-text("Aceptar")').first();
  if (await cookieBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await cookieBtn.click();
  }
}

export async function searchProduct(page: Page, term: string): Promise<void> {
  const searchInput = page
    .locator('[data-testid="blt26617d4f2e17657d-header-search-input"]:visible')
    .first();

  await searchInput.waitFor({ state: 'visible', timeout: 15000 });
  await searchInput.fill(term);
  await searchInput.press('Enter');
  await page.waitForLoadState('domcontentloaded');
}

export async function filterByColor(page: Page, color: string): Promise<void> {
  const colorBtn = page.getByRole('button', { name: color });
  await colorBtn.waitFor({ state: 'visible', timeout: 15000 });
  await colorBtn.click();
  await page.waitForTimeout(2000);
}

export async function sortByLowestPrice(page: Page): Promise<void> {
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
  const numMatch = cleaned.match(/[\d.]+/);
  if (!numMatch) return cleaned;
  return `$${parseFloat(numMatch[0]).toFixed(2)}`;
}

export async function extractFirstNProducts(page: Page, n: number): Promise<UIProduct[]> {
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