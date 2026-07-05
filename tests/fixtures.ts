import { test as base, Page } from '@playwright/test';
import { launchStealthBrowser } from './utils/stealth-browser';

export const test = base.extend<{ page: Page }>({
  page: async ({}, use, testInfo) => {
    const headless = process.env.HEADED !== 'true';
    const browser = await launchStealthBrowser(headless);
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: 'es-MX',
      timezoneId: 'America/Mexico_City',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    await use(page);

    await context.close();
    await browser.close();
  },
});

export { expect } from '@playwright/test';