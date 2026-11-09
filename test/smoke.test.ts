import { chromium } from 'playwright';
import { expect, test } from 'vitest';

test('headless Chromium launches, opens a page, and closes', async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent('<title>hi</title><p>ok</p>');
  expect(await page.title()).toBe('hi');
  await browser.close();
});
