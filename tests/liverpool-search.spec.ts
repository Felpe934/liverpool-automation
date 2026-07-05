import { test, expect } from './fixtures';
import { gotoWithHydrationRetry } from './utils/navigation';
import { interceptSearchResponse, crossValidate } from './utils/api-validation';
import {
  acceptCookiesIfPresent,
  searchProduct,
  filterByColor,
  sortByLowestPrice,
  extractFirstNProducts,
} from './utils/liverpool-flow';

const BASE_URL = 'https://www.liverpool.com.mx/tienda/home';
const SEARCH_TERM = 'playstation 5';
const COLOR_FILTER = 'Blanco';

test('Buscar Playstation 5, filtrar por Blanco, ordenar por menor precio y validar contra API', async ({
  page,
}) => {
  await gotoWithHydrationRetry(page, BASE_URL);
  await acceptCookiesIfPresent(page);
  await searchProduct(page, SEARCH_TERM);
  await filterByColor(page, COLOR_FILTER);

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