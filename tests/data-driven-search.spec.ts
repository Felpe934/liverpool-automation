import { test, expect } from './fixtures';
import { gotoWithHydrationRetry } from './utils/navigation';
import { acceptCookiesIfPresent, searchProduct, extractFirstNProducts } from './utils/liverpool-flow';

const BASE_URL = 'https://www.liverpool.com.mx/tienda/home';

// Bonus: Data-driven tests — el mismo test corre para cada término sin duplicar código.
const searchTerms = ['playstation 5', 'xbox series x', 'nintendo switch'];

for (const term of searchTerms) {
  test(`Búsqueda parametrizada: "${term}" devuelve resultados válidos`, async ({ page }) => {
    await gotoWithHydrationRetry(page, BASE_URL);
    await acceptCookiesIfPresent(page);
    await searchProduct(page, term);

    const products = await extractFirstNProducts(page, 5);

    console.log(`--- Resultados para "${term}" ---`);
    products.forEach((p, i) => console.log(`${i + 1}. ${p.name} - ${p.price}`));

    expect(products.length).toBeGreaterThan(0);
    products.forEach((p) => {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.price).toMatch(/^\$[\d.]+$/);
    });
  });
}