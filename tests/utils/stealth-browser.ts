import { chromium as chromiumExtra } from 'playwright-extra';
// @ts-ignore - el paquete no tiene tipos oficiales de TS
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser } from '@playwright/test';

chromiumExtra.use(StealthPlugin());

export async function launchStealthBrowser(headless: boolean): Promise<Browser> {
  const browser = await chromiumExtra.launch({
    headless,
    args: ['--disable-blink-features=AutomationControlled'],
  });
  return browser as unknown as Browser;
}