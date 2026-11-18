import type { Locator, Page } from 'playwright';
import type { Annotation, AnnotationKind, ArrowSide } from '../parse/types.js';
import type { Rect } from './region.js';

export const DEFAULT_ANNOTATION_COLOUR = '#ff31a0';
export const DEFAULT_ARROW_SIDE: ArrowSide = 'left';

/** An annotation with its defaults filled in, ready to draw. */
export interface PlannedAnnotation {
  kind: AnnotationKind;
  color: string;
  /** The side an arrow sits on; unused by the other kinds. */
  from: ArrowSide;
  /** A badge's number, counted from 1 over the badges in listed order. */
  number?: number;
}

/** Fills in colour and side, and numbers the badges 1, 2, 3 in the order they are listed. */
export function planAnnotations(list: Annotation[]): PlannedAnnotation[] {
  let badges = 0;
  return list.map((a) => {
    const planned: PlannedAnnotation = {
      kind: a.kind,
      color: a.color ?? DEFAULT_ANNOTATION_COLOUR,
      from: a.from ?? DEFAULT_ARROW_SIDE,
    };
    if (a.kind === 'badge') planned.number = ++badges;
    return planned;
  });
}

/** Everything drawn for one screenshot; `remove` takes it all off the page again. */
export interface Drawn {
  /** Where each annotation was drawn, in document coordinates, outline included. */
  bounds: Rect[];
  remove: () => Promise<void>;
}

/**
 * Draws one annotation over the element, inside a single overlay host that is created on the
 * first call. Runs in the page, so it cannot use anything from this module.
 *
 * The host has a shadow root and `all: initial`, so the page's own selectors and inherited styles
 * do not reach what is drawn. Everything is built with DOM calls and CSSOM, never a `<style>`
 * element, a `style` attribute string or `innerHTML`, which a strict Content-Security-Policy
 * blocks. The host takes no pointer events, takes no space, and sits above everything.
 */
function drawInPage(el: Element, a: { kind: AnnotationKind; color: string; from: ArrowSide; number?: number }): Rect {
  const OUTLINE = '#fff';
  const w = window as unknown as { __shotdocOverlay?: { host: HTMLElement; root: ShadowRoot } };
  if (!w.__shotdocOverlay) {
    // A custom element, so page rules for `div` and the like do not reach the host itself.
    const host = document.createElement('shotdoc-overlay');
    host.style.cssText =
      'all: initial; display: block; position: absolute; top: 0; left: 0; width: 0; height: 0; overflow: visible; pointer-events: none; z-index: 2147483647;';
    w.__shotdocOverlay = { host, root: host.attachShadow({ mode: 'open' }) };
    document.documentElement.appendChild(host);
  }
  const { root } = w.__shotdocOverlay;

  const r = el.getBoundingClientRect();
  const left = r.left + window.scrollX;
  const top = r.top + window.scrollY;
  const place = (node: HTMLElement | SVGElement, x: number, y: number, width: number, height: number) => {
    node.style.position = 'absolute';
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.width = `${width}px`;
    node.style.height = `${height}px`;
  };

  if (a.kind === 'highlight') {
    const outset = 5; // border 3 + inner ring 2, so the inner ring stops at the element's edge
    const box = document.createElement('div');
    place(box, left - outset, top - outset, r.width + outset * 2, r.height + outset * 2);
    box.style.boxSizing = 'border-box';
    box.style.border = `3px solid ${a.color}`;
    box.style.borderRadius = '4px';
    box.style.boxShadow = `0 0 0 2px ${OUTLINE}, inset 0 0 0 2px ${OUTLINE}`;
    root.appendChild(box);
    const reach = outset + 2; // the white ring outside the border
    return { x: left - reach, y: top - reach, width: r.width + reach * 2, height: r.height + reach * 2 };
  }

  if (a.kind === 'arrow') {
    const gap = 6;
    const horizontal = a.from === 'left' || a.from === 'right';
    const aw = horizontal ? 80 : 40;
    const ah = horizontal ? 40 : 80;
    const transform = {
      left: '',
      right: 'translate(80,0) scale(-1,1)',
      top: 'translate(40,0) rotate(90)',
      bottom: 'translate(0,80) rotate(-90)',
    }[a.from];
    const pos = {
      left: { x: left - gap - aw, y: top + r.height / 2 - ah / 2 },
      right: { x: left + r.width + gap, y: top + r.height / 2 - ah / 2 },
      top: { x: left + r.width / 2 - aw / 2, y: top - gap - ah },
      bottom: { x: left + r.width / 2 - aw / 2, y: top + r.height + gap },
    }[a.from];
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('width', String(aw));
    svg.setAttribute('height', String(ah));
    svg.setAttribute('viewBox', `0 0 ${aw} ${ah}`);
    place(svg, pos.x, pos.y, aw, ah);
    svg.style.overflow = 'visible';
    const g = document.createElementNS(ns, 'g');
    if (transform) g.setAttribute('transform', transform);
    const arrow = document.createElementNS(ns, 'polygon');
    arrow.setAttribute('points', '0,15 50,15 50,0 80,20 50,40 50,25 0,25');
    arrow.setAttribute('fill', a.color);
    arrow.setAttribute('stroke', OUTLINE);
    arrow.setAttribute('stroke-width', '2');
    arrow.setAttribute('stroke-linejoin', 'round');
    g.appendChild(arrow);
    svg.appendChild(g);
    root.appendChild(svg);
    const stroke = 1; // half the white stroke lies outside the shape
    return { x: pos.x - stroke, y: pos.y - stroke, width: aw + stroke * 2, height: ah + stroke * 2 };
  }

  const size = 28;
  const x = left - size / 2;
  const y = top - size / 2;
  const badge = document.createElement('div');
  place(badge, x, y, size, size);
  badge.textContent = String(a.number ?? '');
  badge.style.boxSizing = 'border-box';
  badge.style.borderRadius = '50%';
  badge.style.background = a.color;
  badge.style.border = `2px solid ${OUTLINE}`;
  badge.style.color = OUTLINE;
  badge.style.font = 'bold 15px/24px sans-serif';
  badge.style.textAlign = 'center';
  root.appendChild(badge);
  return { x, y, width: size, height: size };
}

async function removeOverlay(page: Page): Promise<void> {
  // The page can be gone when a capture fails badly; there is nothing to take off then.
  await page
    .evaluate(() => {
      const w = window as unknown as { __shotdocOverlay?: { host: HTMLElement } };
      w.__shotdocOverlay?.host.remove();
      delete w.__shotdocOverlay;
    })
    .catch(() => undefined);
}

/**
 * Draws the planned annotations, each over its element, and returns where they landed. If one
 * fails, whatever was already drawn is taken off again before the error goes on.
 */
export async function drawAnnotations(
  page: Page,
  items: { locator: Locator; plan: PlannedAnnotation }[],
): Promise<Drawn> {
  const bounds: Rect[] = [];
  try {
    for (const { locator, plan } of items) {
      bounds.push(await locator.evaluate(drawInPage, plan));
    }
  } catch (e) {
    await removeOverlay(page);
    throw e;
  }
  return { bounds, remove: () => removeOverlay(page) };
}
