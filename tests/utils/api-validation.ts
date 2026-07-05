import { Page, Response } from '@playwright/test';
import { ApiProduct, UIProduct, ValidationResult } from './types';

/**
 * Intercepta la respuesta del endpoint de búsqueda de productos
 * y devuelve la lista completa de productos parseados.
 */
export async function interceptSearchResponse(page: Page): Promise<ApiProduct[]> {
  const response: Response = await page.waitForResponse(
    (res) =>
      res.url().includes('/web-bff/product/search') &&
      res.request().method() === 'GET' &&
      res.status() === 200,
    { timeout: 20000 }
  );

  const json = await response.json();
  const products = json.products ?? [];

  return products.map((p: any) => {
    // Tomamos la primera variante (la que corresponde al filtro de color aplicado)
    const variant = p.variants?.[0];
    const rawPrice = variant?.prices?.sortPrice ?? variant?.prices?.promoPrice ?? '0';
    return {
      id: p.id,
      title: (p.title ?? '').trim(),
      price: normalizeApiPrice(rawPrice),
    };
  });
}

function normalizeApiPrice(raw: string | number): string {
  const num = typeof raw === 'string' ? parseFloat(raw) : raw;
  return `$${num.toFixed(2)}`;
}

/**
 * Compara los resultados extraídos de la UI contra los productos
 * obtenidos de la respuesta interceptada de la API.
 */
export function crossValidate(
  uiProducts: UIProduct[],
  apiProducts: ApiProduct[]
): ValidationResult {
  const discrepancies: string[] = [];
  let matched = 0;

  for (const uiProduct of uiProducts) {
    // Buscamos el producto de la API cuyo título se parezca más al nombre de la UI
    const apiMatch = apiProducts.find((api) =>
      normalizeText(api.title) === normalizeText(uiProduct.name)
    );

    if (!apiMatch) {
      discrepancies.push(
        `NO ENCONTRADO en API: "${uiProduct.name}" (precio UI: ${uiProduct.price})`
      );
      continue;
    }

    matched++;

    if (normalizePriceValue(apiMatch.price) !== normalizePriceValue(uiProduct.price)) {
      discrepancies.push(
        `DIFERENCIA DE PRECIO: "${uiProduct.name}" → UI: ${uiProduct.price} | API: ${apiMatch.price}`
      );
    }
  }

  return {
    matched,
    total: uiProducts.length,
    discrepancies,
  };
}

function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

function normalizePriceValue(price: string): number {
  const match = price.match(/[\d.]+/);
  return match ? parseFloat(match[0]) : NaN;
}