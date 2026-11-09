import assert from 'node:assert/strict';
import { launch, newStableContext, shot } from '../lib/render.js';
import { highlight, arrow, badge, clearAnnotations } from '../lib/annotate.js';

const html = `<body style="margin:0;font:16px sans-serif">
  <div style="padding:120px 200px">
    <h1 id="h">Title</h1>
    <button id="b" style="margin:20px">Save</button>
    <p id="p">Some paragraph text that wraps. ${'lorem ipsum '.repeat(20)}</p>
    <div id="far" style="height:1200px">tall</div>
  </div></body>`;

const browser = await launch();
const page = await (await newStableContext(browser)).newPage();
await page.setContent(html);

const snapshot = () =>
  page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('body *:not([data-doxer]):not(#__doxer_overlay)')) {
      const r = el.getBoundingClientRect();
      out[el.id || el.tagName] = [r.left, r.top, r.width, r.height].map((n) => +n.toFixed(3));
    }
    out.__scroll = [document.documentElement.scrollWidth, document.documentElement.scrollHeight];
    return out;
  });

const before = await snapshot();
const target = page.locator('#b');
const bounds = [
  await highlight(target),
  await arrow(target, { from: 'left' }),
  await arrow(target, { from: 'right' }),
  await arrow(target, { from: 'top' }),
  await arrow(target, { from: 'bottom' }),
  await badge(target, 1),
];
const after = await snapshot();

assert.deepEqual(after, before, 'element positions/scroll size changed after annotating');
console.log('layout unchanged after highlight + 4 arrows + badge (positions and scroll size identical)');
for (const b of bounds) assert.ok(b.width > 0 && b.height > 0);

await shot(page, new URL('../out/t2-2-annotated.png', import.meta.url).pathname, { clip: { x: 100, y: 100, width: 600, height: 300 } });
await clearAnnotations(page);
assert.equal(await page.locator('[data-doxer]').count(), 0);
assert.deepEqual(await snapshot(), before);
console.log('clearAnnotations removed everything; layout still identical');
await browser.close();
