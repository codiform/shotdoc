import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Locator, Page } from 'playwright';
import { ShotdocError } from '../errors.js';
import { describeTarget, type Step, type Target } from '../parse/types.js';
import { drawAnnotations, planAnnotations } from './annotate.js';
import { blankColour } from './blank.js';
import { clamp, type Rect, region, scrollToFit, trimRect } from './region.js';
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
          if (still >= 2) {
            resolve();
          } else if (performance.now() - started > timeout) {
            reject(new Error('element kept moving'));
          } else {
            requestAnimationFrame(tick);
          }
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

async function measure(page: Page, locators: Locator[], pageSize?: Effects['pageSize']): Promise<Geometry> {
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
  return { rects, page: pageSize ?? { width: env.width, height: env.height }, scroll: { x: env.x, y: env.y } };
}

/** The measured rects with the screenshot's `trim` applied to the target's, which is the first. */
function trimmed({ rects, page }: Geometry, step: ScreenshotStep): Rect[] {
  if (!step.trim) {
    return rects;
  }
  const [target, ...included] = rects as [Rect, ...Rect[]];
  const left = trimRect(target, step.trim);
  const what = describeTarget(step.target!);
  // A hundredth of a pixel, so percentages that add to 100 are not saved by rounding error.
  const empty = (r: Rect) => r.width < 0.01 || r.height < 0.01;
  if (empty(left)) {
    const size = `${Math.round(target.width * 100) / 100}x${Math.round(target.height * 100) / 100}`;
    throw new ShotdocError(
      `screenshot "${step.name}": trim leaves nothing of the target ${what}, which is ${size} CSS pixels`,
    );
  }
  // A target can hang off the page's edge, and what is left of it can be all in that part.
  if (empty(clamp(left, page.width, page.height))) {
    throw new ShotdocError(
      `screenshot "${step.name}": trim leaves none of the target ${what} on the page; the rest of it is off the edge`,
    );
  }
  return [left, ...included];
}

const contains = (clip: Rect, sx: number, sy: number, vw: number, vh: number) =>
  clip.x >= sx && clip.y >= sy && clip.x + clip.width <= sx + vw && clip.y + clip.height <= sy + vh;

type ScreenshotStep = Extract<Step, { kind: 'screenshot' }>;

/** What a capture needs on top of `SHOT_OPTS` for this screenshot's `hide`, `mask` and `annotate`. */
interface Effects {
  /** Extra Playwright screenshot options (the mask). */
  opts: { mask?: Locator[]; maskColor?: string };
  masked: boolean;
  /** Where the annotations were drawn, which the captured region must include. */
  bounds: Rect[];
  /**
   * The page's size from before anything was drawn. An annotation hanging off the right or bottom
   * edge makes the page scroll further, and the region is cut at the page edge, not at that.
   */
  pageSize?: { width: number; height: number };
  /** Puts every hidden element back and takes every annotation off. */
  restore: () => Promise<void>;
}

/** An annotation target to draw on, with the target waited for and resolved. */
interface AnnotationLocator {
  locator: Locator;
  step: ScreenshotStep['annotate'][number];
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

/** A hide or mask target with the rule it is held to: a screenshot's own must match, a default need not. */
interface Layered {
  target: Target;
  strict: boolean;
}

/**
 * The hide list, mask list and mask colour for one capture, built from layers in order: the
 * document's defaults, then the screenshot's own. Only the screenshot's own targets are strict.
 * Project-wide defaults from the config file and standing steps would be further layers, added
 * before and between these two.
 */
function resolveEffects(step: ScreenshotStep): { hide: Layered[]; mask: Layered[]; maskColor: string } {
  const layers = (defaults: Target[], own: Target[]): Layered[] => [
    ...defaults.map((target) => ({ target, strict: false })),
    ...own.map((target) => ({ target, strict: true })),
  ];
  return {
    hide: layers(step.defaults.hide, step.hide),
    mask: layers(step.defaults.mask, step.mask),
    maskColor: step.maskColor ?? step.defaults.maskColor ?? DEFAULT_MASK_COLOUR,
  };
}

/**
 * Applies the screenshot's `hide`, `mask` and `annotate`, and the document's hide and mask
 * defaults, once its targets are ready. Everything that can fail is checked before the page is
 * touched. Hiding sets `visibility: hidden` on every match, which keeps each element's space, and
 * remembers the old inline value so `restore` can put it back. Annotations are then drawn in an
 * overlay, after the page's size is measured, and their bounds are returned for the captured
 * region; `restore` removes the overlay. The mask is painted by Playwright into the image only, so
 * it covers annotations too. A default target is applied to whatever matches at this moment and is
 * never waited for.
 */
async function applyEffects(page: Page, step: ScreenshotStep, annotations: AnnotationLocator[]): Promise<Effects> {
  const effects = resolveEffects(step);
  const hide = effects.hide.map((l) => ({ ...l, loc: locate(page, l.target) }));
  const mask = effects.mask.map((l) => ({ ...l, loc: locate(page, l.target) }));

  if (!(await page.evaluate((c) => CSS.supports('color', c), effects.maskColor))) {
    throw new ShotdocError(`maskColor "${effects.maskColor}" is not a colour the browser understands`);
  }
  for (const a of annotations) {
    const color = a.step.color;
    if (color !== undefined && !(await page.evaluate((c) => CSS.supports('color', c), color))) {
      throw new ShotdocError(`${a.step.kind} color "${color}" is not a colour the browser understands`);
    }
  }
  for (const { target, strict, loc } of hide) {
    if (strict) {
      await requireMatch(loc, 'hide', target);
    }
  }
  for (const { target, strict, loc } of mask) {
    if (strict) {
      await requireMatch(loc, 'mask', target);
    }
  }

  const pageSize = annotations.length
    ? await page.evaluate(() => ({
        width: Math.max(document.documentElement.scrollWidth, window.innerWidth),
        height: Math.max(document.documentElement.scrollHeight, window.innerHeight),
      }))
    : undefined;

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

  let drawn: Awaited<ReturnType<typeof drawAnnotations>> | undefined;
  const restore = async () => {
    await drawn?.remove();
    if (hide.length === 0) {
      return;
    }
    // The page can be gone when a capture fails badly; there is nothing to put back then.
    await page
      .evaluate(() => {
        const w = window as unknown as { __shotdocHidden?: { el: HTMLElement; value: string; priority: string }[] };
        // Last in, first out: an element matched twice was saved again as hidden, and its original
        // value, saved first, has to be the one put back.
        for (const { el, value, priority } of [...(w.__shotdocHidden ?? [])].reverse()) {
          if (value) {
            el.style.setProperty('visibility', value, priority);
          } else {
            el.style.removeProperty('visibility');
          }
        }
        delete w.__shotdocHidden;
      })
      .catch(() => undefined);
  };

  if (annotations.length) {
    try {
      const plans = planAnnotations(annotations.map((a) => a.step));
      drawn = await drawAnnotations(
        page,
        annotations.map((a, i) => ({ locator: a.locator, plan: plans[i]! })),
      );
    } catch (e) {
      await restore();
      throw e;
    }
  }

  return {
    opts: mask.length ? { mask: mask.map((m) => m.loc), maskColor: effects.maskColor } : {},
    masked: mask.length > 0,
    bounds: drawn?.bounds ?? [],
    ...(pageSize ? { pageSize } : {}),
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

  // Annotation targets are waited for before the page is touched, so a failure leaves nothing to undo.
  const annotations: AnnotationLocator[] = [];
  if (step.annotate.length) {
    await locators[0]!.scrollIntoViewIfNeeded();
  }
  for (const a of step.annotate) {
    const locator = locate(page, a.target);
    const what = describeTarget(a.target);
    try {
      await waitUntilReady(locator);
    } catch (e) {
      throw new ShotdocError(`${a.kind} target ${what}: ${explain(e, what).reason}`);
    }
    annotations.push({ locator, step: a });
  }

  const fx = await applyEffects(page, step, annotations);
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
    const g = await measure(page, locators, fx.pageSize);
    const clip = region([...trimmed(g, step), ...fx.bounds], padding, g.page.width, g.page.height);
    if (clip.width > vp.width || clip.height > vp.height) {
      break;
    }
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
  const g = await measure(page, locators, fx.pageSize);
  const clip = region([...trimmed(g, step), ...fx.bounds], padding, g.page.width, g.page.height);
  save(path, await page.screenshot({ clip, fullPage: true, ...shotOpts }), step.name, fx.masked);
}
