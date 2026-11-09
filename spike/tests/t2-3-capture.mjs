import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { launch, newStableContext, DEFAULTS } from '../lib/render.js';
import { highlight, arrow, clearAnnotations } from '../lib/annotate.js';
import { captureElement } from '../lib/capture.js';

const out = (n) => new URL(`../out/${n}`, import.meta.url).pathname;
const SCALE = DEFAULTS.deviceScaleFactor;

// count "annotation pink" pixels (#ff31a0, tolerant)
function pinkPixels(file) {
  const png = PNG.sync.read(readFileSync(file));
  let n = 0;
  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b] = [png.data[i], png.data[i + 1], png.data[i + 2]];
    if (r > 230 && g > 30 && g < 80 && b > 140 && b < 180) n++;
  }
  return { n, png };
}

const html = `<body style="margin:0;font:16px sans-serif">
  <div style="padding:200px 300px"><button id="b" style="padding:12px 24px">Save</button></div>
  <button id="edge" style="position:absolute;left:0;top:0;width:90px;height:30px">Edge</button>
  </body>`;

const browser = await launch();
const page = await (await newStableContext(browser)).newPage();
await page.setContent(html);
const btn = page.locator('#b');

// Control: a plain element screenshot does NOT include an outside arrow.
const a = await arrow(btn, { from: 'left' });
const h = await highlight(btn);
await btn.screenshot({ path: out('t2-3-control.png'), animations: 'disabled', caret: 'hide' });
const control = pinkPixels(out('t2-3-control.png'));
console.log(`control (locator.screenshot): ${control.n} pink px, ${control.png.width}x${control.png.height}`);

// Our wrapper: union clip includes the arrow.
const r = await captureElement(page, btn, out('t2-3-union.png'), { padding: 10, annotations: [a, h] });
const withUnion = pinkPixels(out('t2-3-union.png'));
console.log(`union capture: ${withUnion.n} pink px, ${withUnion.png.width}x${withUnion.png.height}, clip=${JSON.stringify(r.clip)}`);
assert.ok(withUnion.n > control.n * 3, 'arrow should add many pink pixels vs control');
assert.ok(r.clip.x < r.element.x - 80, 'clip should extend left past the arrow');

// Padding with no annotations: exact size = element + 2*padding (page has room).
await clearAnnotations(page);
const r2 = await captureElement(page, btn, out('t2-3-pad.png'), { padding: 16 });
const pad = PNG.sync.read(readFileSync(out('t2-3-pad.png')));
// Clip is snapped outward to whole CSS px, so the image is exactly clip size x scale, in either mode.
assert.equal(pad.width, r2.clip.width * SCALE);
assert.equal(pad.height, r2.clip.height * SCALE);
assert.ok(r2.clip.width >= r2.element.width + 32 && r2.clip.width < r2.element.width + 34, 'snapped width within 2px of element+2*padding');
console.log(`padding ok: ${pad.width}x${pad.height} (mode=${r2.mode}) for element ${r2.element.width}x${r2.element.height} + 16px`);

// Clamping: element at the page's top-left corner with padding must not throw or go negative.
const r3 = await captureElement(page, page.locator('#edge'), out('t2-3-edge.png'), { padding: 20 });
assert.ok(r3.clip.x === 0 && r3.clip.y === 0);
console.log(`clamp ok: clip=${JSON.stringify(r3.clip)}`);

await browser.close();
