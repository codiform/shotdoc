// Reproduce shot-scraper's annotated Datasette column-menu screenshot using helpers, not raw JS.
// (The original 2022 demo URL now 404s; this uses Datasette's current public demo.)
import { launch, newStableContext } from '../lib/render.js';
import { arrow } from '../lib/annotate.js';
import { captureElement, documentRect } from '../lib/capture.js';

const browser = await launch();
const page = await (await newStableContext(browser)).newPage();
await page.goto('https://latest.datasette.io/fixtures/facetable', { waitUntil: 'networkidle' });

const header = page.locator('th.col-state');
await header.locator('button').click();
const facet = page.getByText('Facet by this');
await facet.waitFor({ state: 'visible' });

const pointer = await arrow(facet, { from: 'left', gap: 4 });
const menuBottom = await documentRect(page.getByText('Type: TEXT'));
await captureElement(page, header, new URL('../out/datasette-annotated.png', import.meta.url).pathname, {
  padding: 40,
  annotations: [pointer, menuBottom],
});
console.log('wrote out/datasette-annotated.png');
await browser.close();
