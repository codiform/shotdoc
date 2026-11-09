// Log in with saucedemo's publicly shown demo credentials and save storage state.
import { mkdirSync } from 'node:fs';
import { launch, newStableContext } from '../lib/render.js';

const STATE = new URL('../.state/saucedemo.json', import.meta.url).pathname;
mkdirSync(new URL('../.state/', import.meta.url).pathname, { recursive: true });

const browser = await launch();
const ctx = await newStableContext(browser);
const page = await ctx.newPage();
await page.goto('https://www.saucedemo.com/');
await page.fill('#user-name', 'standard_user'); // public demo credentials shown on the page
await page.fill('#password', 'secret_sauce');
await page.click('#login-button');
await page.waitForURL('**/inventory.html');
await ctx.storageState({ path: STATE });
console.log(`saved state -> ${STATE}`);
await browser.close();
