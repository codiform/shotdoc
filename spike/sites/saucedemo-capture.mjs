// Headless run that loads saved state and captures an element crop of a post-login page.
// Fails clearly (and writes nothing) if the state is missing.
import { existsSync } from 'node:fs';
import { launch, newStableContext } from '../lib/render.js';
import { captureElement } from '../lib/capture.js';

const NAME = 'saucedemo';
const STATE = new URL(`../.state/${NAME}.json`, import.meta.url).pathname;
const OUT = new URL('../out/saucedemo-item.png', import.meta.url).pathname;

if (!existsSync(STATE)) {
  console.error(`Missing saved state "${NAME}" (expected at ${STATE}). Run sites/saucedemo-login.mjs to create it.`);
  process.exit(1);
}

const browser = await launch();
try {
  const ctx = await newStableContext(browser, { storageState: STATE });
  const page = await ctx.newPage();
  await page.goto('https://www.saucedemo.com/inventory.html');
  // A state that no longer works lands on the login page; refuse to screenshot that.
  if (await page.locator('#login-button').count()) {
    console.error(`Saved state "${NAME}" is not logged in (expired?). Re-run sites/saucedemo-login.mjs.`);
    process.exitCode = 1;
  } else {
    const r = await captureElement(page, page.locator('.inventory_item').first(), OUT, { padding: 16 });
    console.log(`captured ${OUT} clip=${JSON.stringify(r.clip)}`);
  }
} finally {
  await browser.close();
}
