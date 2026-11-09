// Two-launch determinism check for the non-Grafana scenarios, with the blank-image guard.
import { runTwice, colorVariety } from '../lib/determinism.js';
import { captureElement } from '../lib/capture.js';
import { highlight, arrow } from '../lib/annotate.js';

const STATE = new URL('../.state/saucedemo.json', import.meta.url).pathname;
const results = {};

results.saucedemo = await runTwice('det-saucedemo', async (page, path) => {
  await page.goto('https://www.saucedemo.com/inventory.html');
  await captureElement(page, page.locator('.inventory_item').first(), path, { padding: 16 });
}, { ctxOpts: { storageState: STATE } });

results.todomvc = await runTwice('det-todomvc', async (page, path) => {
  await page.goto('https://demo.playwright.dev/todomvc/');
  for (const t of ['Write the docs', 'Take screenshots', 'Ship it']) {
    await page.locator('.new-todo').fill(t);
    await page.locator('.new-todo').press('Enter');
  }
  const item = page.locator('.todo-list li').nth(1);
  await item.locator('.toggle').check();
  const bounds = [await highlight(item), await arrow(item.locator('.toggle'), { from: 'left' })];
  await captureElement(page, page.locator('.todoapp'), path, { padding: 24, annotations: bounds });
});

results.datasette = await runTwice('det-datasette', async (page, path) => {
  await page.goto('https://latest.datasette.io/fixtures/facetable', { waitUntil: 'networkidle' });
  const header = page.locator('th.col-state');
  await header.locator('button').click();
  const facet = page.getByText('Facet by this');
  await facet.waitFor({ state: 'visible' });
  const pointer = await arrow(facet, { from: 'left', gap: 4 });
  const { documentRect } = await import('../lib/capture.js');
  await captureElement(page, header, path, { padding: 40, annotations: [pointer, await documentRect(page.getByText('Type: TEXT'))] });
});

for (const [k, r] of Object.entries(results))
  console.log(k.padEnd(10), JSON.stringify({ colors: colorVariety(r.files[0]), byteIdentical: r.byteIdentical, size: r.sizeA, exactDiff: r.exactDiff, tolerantDiff: r.tolerantDiff }));
