import { test, expect } from './fixtures';
import { gotoWithHydrationRetry } from './utils/navigation';
import { acceptCookiesIfPresent, searchProduct } from './utils/liverpool-flow';

const BASE_URL = 'https://www.liverpool.com.mx/tienda/home';
const SEARCH_TERM = 'playstation 5';
const MAX_LOAD_TIME_MS = 8000; // 8 segundos como umbral aceptable

test('La página de resultados de búsqueda carga en un tiempo aceptable', async ({ page }) => {
  await gotoWithHydrationRetry(page, BASE_URL);
  await acceptCookiesIfPresent(page);

  const startTime = Date.now();

  await searchProduct(page, SEARCH_TERM);

  // Esperamos a que al menos una tarjeta de producto sea visible,
  // que es la señal real de que la página de resultados terminó de cargar.
  await page
    .locator('a[data-testid$="-card-card-link"]')
    .first()
    .waitFor({ state: 'visible', timeout: MAX_LOAD_TIME_MS + 5000 });

  const elapsedTime = Date.now() - startTime;

  console.log(`Tiempo de carga de resultados de búsqueda: ${elapsedTime}ms`);

  expect(elapsedTime).toBeLessThan(MAX_LOAD_TIME_MS);
});