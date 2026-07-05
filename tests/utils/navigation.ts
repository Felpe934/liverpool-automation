import { Page, Response } from '@playwright/test';

export async function gotoWithHydrationRetry(
  page: Page,
  url: string,
  maxRetries = 5
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    let assetFailed = false;

    const onResponse = (res: Response) => {
      if (res.status() >= 400 && res.url().includes('_next/static')) {
        assetFailed = true;
      }
    };

    page.on('response', onResponse);

    if (attempt === 1) {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    } else {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    // Backoff progresivo: 2s, 3s, 4s, 5s...
    await page.waitForTimeout(2000 + attempt * 1000);
    page.off('response', onResponse);

    if (!assetFailed) return;

    console.log(`Intento ${attempt}/${maxRetries}: assets rotos (404), reintentando...`);
  }

  throw new Error(
    `No se pudo cargar la página tras ${maxRetries} intentos (assets estáticos 404 persistentes). Esto sugiere un problema del lado del sitio (CDN/build desincronizado), no del framework de pruebas.`
  );
}