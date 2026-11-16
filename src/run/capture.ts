import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Locator, Page } from 'playwright';
import { ShotdocError } from '../errors.js';
import { describeTarget, type Step, type Target } from '../parse/types.js';
import { blankColour } from './blank.js';
import { type Rect, region, scrollToFit } from './region.js';
import { type Session, TIMEOUT_MS } from './session.js';
import { explain, locate } from './targets.js';

export const DEFAULT_PADDING = 16;
export const DEFAULT_MASK_COLOUR = '#555555';

/** Options on every capture: settle CSS animations to their end state and hide the caret. */
const SHOT_OPTS = { animations: 'disabled', caret: 'hide', type: 'png', scale: 'device' } as const;

/** Writes the image, unless it is a single colour throughout: a blank capture is never kept. */
function save(path: string, png: Buffer, name: string, masked: boolean): void {
  const colour = blankColour(png);
  if (colour) {
    const hint = masked ? '. A mask may be covering everything in the image' : '';
    throw new ShotdocError(
      `screenshot "${name}" is blank: every pixel is the same colour (${colour}). The page may not have finished loading; add a wait step for something that appears when it is ready${hint}`,
    );
  }
  writeFileSync(path, png);
}

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

type ScreenshotStep = Extract<Step, { kind: 'screenshot' }>;

/** What a capture needs on top of `SHOT_OPTS` for this screenshot's `hide` and `mask`. */
interface Effects {
  /** Extra Playwright screenshot options (the mask). */
  opts: { mask?: Locator[]; maskColor?: string };
  masked: boolean;
  /** Puts every hidden element back as it was. */
  restore: () => Promise<void>;
}

/** Waits for at least one element to match, so a selector that matches nothing is a failure. */
async function requireMatch(locator: Locator, option: 'hide' | 'mask', target: Target): Promise<void> {
  try {
    await locator.first().waitFor({ state: 'attached' });
  } catch (e) {
    const what = describeTarget(target);
    throw new ShotdocError(`${option} target ${what}: ${explain(e, what).reason}`);
  }
}

/**
 * Applies the screenshot's `hide` and `mask` once its target is ready. Hiding sets
 * `visibility: hidden` on every match, which keeps each element's space, and remembers the old
 * inline value so `restore` can put it back. The mask is painted by Playwright into the image only.
 */
async function applyEffects(page: Page, step: ScreenshotStep): Promise<Effects> {
  const hide = step.hide.map((t) => ({ t, loc: locate(page, t) }));
  const mask = step.mask.map((t) => ({ t, loc: locate(page, t) }));

  if (step.maskColor !== undefined && !(await page.evaluate((c) => CSS.supports('color', c), step.maskColor))) {
    throw new ShotdocError(`maskColor "${step.maskColor}" is not a colour the browser understands`);
  }
  for (const { t, loc } of hide) await requireMatch(loc, 'hide', t);
  for (const { t, loc } of mask) await requireMatch(loc, 'mask', t);

  for (const { loc } of hide) {
    await loc.evaluateAll((els) => {
      const w = window as unknown as { __shotdocHidden?: { el: HTMLElement; value: string; priority: string }[] };
      const saved = w.__shotdocHidden ?? [];
      for (const el of els as HTMLElement[]) {
        saved.push({
          el,
          value: el.style.getPropertyValue('visibility'),
          priority: el.style.getPropertyPriority('visibility'),
        });
        el.style.setProperty('visibility', 'hidden', 'important');
      }
      w.__shotdocHidden = saved;
    });
  }

  const restore = async () => {
    if (hide.length === 0) return;
    // The page can be gone when a capture fails badly; there is nothing to put back then.
    await page
      .evaluate(() => {
        const w = window as unknown as { __shotdocHidden?: { el: HTMLElement; value: string; priority: string }[] };
        for (const { el, value, priority } of w.__shotdocHidden ?? []) {
          if (value) el.style.setProperty('visibility', value, priority);
          else el.style.removeProperty('visibility');
        }
        delete w.__shotdocHidden;
      })
      .catch(() => undefined);
  };

  return {
    opts: mask.length ? { mask: mask.map((m) => m.loc), maskColor: step.maskColor ?? DEFAULT_MASK_COLOUR } : {},
    masked: mask.length > 0,
    restore,
  };
}

export async function takeScreenshot(session: Session, step: ScreenshotStep, path: string): Promise<void> {
  const page = session.page;
  mkdirSync(dirname(path), { recursive: true });

  const targets = step.target ? [step.target, ...step.include] : [];
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

  const fx = await applyEffects(page, step);
  try {
    await capture(session, step, path, locators, fx);
  } finally {
    await fx.restore();
  }
}

async function capture(
  session: Session,
  step: ScreenshotStep,
  path: string,
  locators: Locator[],
  fx: Effects,
): Promise<void> {
  const page = session.page;
  const shotOpts = { ...SHOT_OPTS, ...fx.opts };

  if (!step.target) {
    save(path, await page.screenshot(shotOpts), step.name, fx.masked);
    return;
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
      const png = await page.screenshot({
        clip: { ...clip, x: clip.x - g.scroll.x, y: clip.y - g.scroll.y },
        ...shotOpts,
      });
      save(path, png, step.name, fx.masked);
      return;
    }
    const to = scrollToFit(clip, g.scroll, vp.width, vp.height);
    await page.evaluate(({ x, y }) => window.scrollTo({ left: x, top: y, behavior: 'instant' }), to);
  }

  // The region is larger than the viewport (or would not settle): capture beyond it.
  const g = await measure(page, locators);
  const clip = region(g.rects, padding, g.page.width, g.page.height);
  save(path, await page.screenshot({ clip, fullPage: true, ...shotOpts }), step.name, fx.masked);
}
