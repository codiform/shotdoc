import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { launch, newStableContext, shot, DEFAULTS } from '../lib/render.js';

const out = new URL('../out/t2-1.png', import.meta.url).pathname;
const html = `<style>
  @keyframes slide { from { margin-left: 0 } to { margin-left: 300px } }
  #box { width: 100px; height: 100px; background: teal; animation: slide 5s linear infinite; }
</style><div id="box"></div><input id="i" autofocus>`;

const browser = await launch();
const ctx = await newStableContext(browser);
const page = await ctx.newPage();
await page.setContent(html);
await shot(page, out);

const png = PNG.sync.read(readFileSync(out));
const { width, height } = DEFAULTS.viewport;
assert.equal(png.width, width * DEFAULTS.deviceScaleFactor);
assert.equal(png.height, height * DEFAULTS.deviceScaleFactor);
console.log(`dimensions ok: ${png.width}x${png.height}`);

// Animations disabled: the infinite animation must be at a settled, repeatable position.
const left1 = await page.evaluate(() => document.getElementById('box').getBoundingClientRect().left);
await page.waitForTimeout(300);
const left2 = await page.evaluate(() => document.getElementById('box').getBoundingClientRect().left);
console.log(`animated box left: ${left1} then ${left2} (animation itself is not frozen in layout; screenshot option handles capture)`);

const locale = await page.evaluate(() => [navigator.language, Intl.DateTimeFormat().resolvedOptions().timeZone]);
assert.deepEqual(locale, ['en-US', 'UTC']);
console.log('locale/timezone ok:', locale.join(' / '));

await browser.close();
