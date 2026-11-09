// Element capture: clip = union(element, annotations) + padding, clamped to the page.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SHOT_OPTS } from './render.js';

export function union(rects) {
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function pad(r, p) {
  return { x: r.x - p, y: r.y - p, width: r.width + 2 * p, height: r.height + 2 * p };
}

export function clamp(r, pageW, pageH) {
  const x1 = Math.max(0, r.x), y1 = Math.max(0, r.y);
  const x2 = Math.min(pageW, r.x + r.width), y2 = Math.min(pageH, r.y + r.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

// Snap outward to whole CSS pixels so the output size does not depend on fractional layout
// or on how a capture mode rounds (viewport clip and fullPage clip round differently).
export function snap(r) {
  const x1 = Math.floor(r.x), y1 = Math.floor(r.y);
  const x2 = Math.ceil(r.x + r.width), y2 = Math.ceil(r.y + r.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export async function documentRect(locator) {
  await locator.waitFor({ state: 'visible' }); // fails (times out) if nothing matches
  return locator.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
  });
}

// Prefers a plain viewport clip (no viewport resize). A fullPage clip resizes the viewport to the
// document size, which breaks apps that scroll an inner container or re-render on resize
// (found with Grafana: panels came back blank). Falls back to fullPage only if the clip does not
// fit in the current viewport; the returned `mode` says which was used.
export async function captureElement(page, locator, path, { padding = 0, annotations = [], ...shotOpts } = {}) {
  const el = await documentRect(locator);
  const { w, h, sx, sy } = await page.evaluate(() => ({
    w: document.documentElement.scrollWidth,
    h: document.documentElement.scrollHeight,
    sx: window.scrollX,
    sy: window.scrollY,
  }));
  const vp = page.viewportSize();
  const clip = snap(clamp(pad(union([el, ...annotations]), padding), w, h));
  mkdirSync(dirname(path), { recursive: true });
  const fits =
    vp && clip.x >= sx && clip.y >= sy && clip.x + clip.width <= sx + vp.width && clip.y + clip.height <= sy + vp.height;
  if (fits) {
    await page.screenshot({ path, clip: { ...clip, x: clip.x - sx, y: clip.y - sy }, ...SHOT_OPTS, ...shotOpts });
    return { clip, element: el, mode: 'viewport' };
  }
  await page.screenshot({ path, clip, fullPage: true, ...SHOT_OPTS, ...shotOpts });
  return { clip, element: el, mode: 'fullPage' };
}
