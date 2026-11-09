// Multi-step walkthrough in ONE session, with a locator-positioned highlight at each step.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { launch, newStableContext } from '../lib/render.js';
import { highlight, arrow, badge, clearAnnotations } from '../lib/annotate.js';
import { captureElement } from '../lib/capture.js';

const out = (n) => new URL(`../out/${n}`, import.meta.url).pathname;
const pink = (file) => {
  const png = PNG.sync.read(readFileSync(file));
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4)
    if (png.data[i] > 230 && png.data[i + 1] > 30 && png.data[i + 1] < 80 && png.data[i + 2] > 140 && png.data[i + 2] < 180) n++;
  return n;
};

const browser = await launch();
const page = await (await newStableContext(browser)).newPage();
await page.goto('https://demo.playwright.dev/todomvc/');
const app = page.locator('.todoapp');
const results = [];

async function step(name, annotate) {
  const bounds = await annotate();
  const file = out(`todomvc-${name}.png`);
  const r = await captureElement(page, app, file, { padding: 24, annotations: bounds });
  await clearAnnotations(page);
  results.push({ name, mode: r.mode, pinkPixels: pink(file), file });
}

// 1. empty app, highlight the input
await step('1-input', async () => [await highlight(page.locator('.new-todo'))]);

// 2. add three items, numbered badges on each
for (const t of ['Write the docs', 'Take screenshots', 'Ship it']) {
  await page.locator('.new-todo').fill(t);
  await page.locator('.new-todo').press('Enter');
}
await step('2-added', async () => {
  const items = page.locator('.todo-list li');
  assert.equal(await items.count(), 3);
  return [await badge(items.nth(0), 1), await badge(items.nth(1), 2), await badge(items.nth(2), 3)];
});

// 3. complete the second item; arrow pointing at its checkbox
await page.locator('.todo-list li').nth(1).locator('.toggle').check();
await step('3-completed', async () => [
  await highlight(page.locator('.todo-list li').nth(1)),
  await arrow(page.locator('.todo-list li').nth(1).locator('.toggle'), { from: 'left' }),
]);

// 4. filter to Active; highlight the filter link
await page.getByRole('link', { name: 'Active' }).click();
await step('4-active', async () => {
  // click() returning does not mean the list has re-rendered (observed: URL changed, list still 3 items).
  await page.waitForFunction(() => document.querySelectorAll('.todo-list li').length === 2);
  assert.equal(await page.locator('.todo-list li').count(), 2);
  return [await highlight(page.getByRole('link', { name: 'Active' }))];
});

await browser.close();
for (const r of results) console.log(r.name.padEnd(12), `mode=${r.mode}`, `pink=${r.pinkPixels}`);
for (const r of results) assert.ok(r.pinkPixels > 200, `${r.name}: highlight not visible`);
console.log('every step shows its highlight');
