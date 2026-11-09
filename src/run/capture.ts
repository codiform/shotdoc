import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Locator, Page } from 'playwright';
import { describeTarget, type Step } from '../parse/types.js';
import { region, scrollToFit, type Rect } from './region.js';
import { TIMEOUT_MS, type Session } from './session.js';
import { explain, locate } from './targets.js';
import { ShotdocError } from '../errors.js';

export const DEFAULT_PADDING = 16;

/** Options on every capture: settle CSS animations to their end state and hide the caret. */
const SHOT_OPTS = { animations: 'disabled', caret: 'hide', type: 'png', scale: 'device' } as const;

/**
 * Waits until the element is visible, then until its box is unchanged across two consecutive
 * animation frames, so a screenshot never catches it mid-move.
 */
async function waitUntilReady(locator: Locator): Promise<void> {
  await locator.waitFor({ state: 'visible' });
  await locator.evaluate(
    (el, timeout) =>
      new Promise<void>((resolve, reject) => {
        const started = performance.now();
        const key = () => {
          const r = el.getBoundingClientRect();
          return `${r.left},${r.top},${r.width},${r.height}`;
        };
        let last = key();
        let still = 0;
        const tick = () => {
          const now = key();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 2) resolve();
          else if (performance.now() - started > timeout) reject(new Error('element kept moving'));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    TIMEOUT_MS,
  );
}

interface Geometry {
  rects: Rect[];
  page: { width: number; height: number };
  scroll: { x: number; y: number };
}

async function measure(page: Page, locators: Locator[]): Promise<Geometry> {
  const rects: Rect[] = [];
  for (const l of locators) {
    rects.push(
      await l.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
      }),
    );
  }
  const env = await page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, window.innerWidth),
    height: Math.max(document.documentElement.scrollHeight, window.innerHeight),
    x: window.scrollX,
    y: window.scrollY,
  }));
  return { rects, page: { width: env.width, height: env.height }, scroll: { x: env.x, y: env.y } };
}

const contains = (clip: Rect, sx: number, sy: number, vw: number, vh: number) =>
  clip.x >= sx && clip.y >= sy && clip.x + clip.width <= sx + vw && clip.y + clip.height <= sy + vh;

export async function takeScreenshot(
  session: Session,
  step: Extract<Step, { kind: 'screenshot' }>,
  path: string,
): Promise<void> {
  const page = session.page;
  mkdirSync(dirname(path), { recursive: true });

  if (!step.target) {
    await page.screenshot({ path, ...SHOT_OPTS });
    return;
  }

  const targets = [step.target, ...step.include];
  const locators = targets.map((t) => locate(page, t));
  for (const [i, loc] of locators.entries()) {
    try {
      await waitUntilReady(loc);
    } catch (e) {
      const what = describeTarget(targets[i]!);
      const err = explain(e, what);
      throw i === 0 ? err : new ShotdocError(`included target ${what}: ${err.reason}`);
    }
  }
  await locators[0]!.scrollIntoViewIfNeeded();

  const vp = page.viewportSize() ?? session.config.viewport;
  const padding = step.padding ?? DEFAULT_PADDING;

  // Viewport-first: keep the viewport size unchanged whenever the region fits. Scroll as needed,
  // re-measuring because scrolling can move things (sticky headers, lazy layout).
  for (let attempt = 0; attempt < 3; attempt++) {
    const g = await measure(page, locators);
    const clip = region(g.rects, padding, g.page.width, g.page.height);
    if (clip.width > vp.width || clip.height > vp.height) break;
    if (contains(clip, g.scroll.x, g.scroll.y, vp.width, vp.height)) {
      await page.screenshot({ path, clip: { ...clip, x: clip.x - g.scroll.x, y: clip.y - g.scroll.y }, ...SHOT_OPTS });
      return;
    }
    const to = scrollToFit(clip, g.scroll, vp.width, vp.height);
    await page.evaluate(({ x, y }) => window.scrollTo({ left: x, top: y, behavior: 'instant' }), to);
  }

  // The region is larger than the viewport (or would not settle): capture beyond it.
  const g = await measure(page, locators);
  const clip = region(g.rects, padding, g.page.width, g.page.height);
  await page.screenshot({ path, clip, fullPage: true, ...SHOT_OPTS });
}
