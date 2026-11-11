export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Smallest rectangle containing all rects. */
export function union(rects: Rect[]): Rect {
  const x1 = Math.min(...rects.map((r) => r.x));
  const y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.width));
  const y2 = Math.max(...rects.map((r) => r.y + r.height));
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function pad(r: Rect, p: number): Rect {
  return { x: r.x - p, y: r.y - p, width: r.width + 2 * p, height: r.height + 2 * p };
}

/** Limits a rect to the page, which starts at 0,0. */
export function clamp(r: Rect, pageWidth: number, pageHeight: number): Rect {
  const x1 = Math.max(0, r.x);
  const y1 = Math.max(0, r.y);
  const x2 = Math.min(pageWidth, r.x + r.width);
  const y2 = Math.min(pageHeight, r.y + r.height);
  return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
}

/**
 * Rounds outward to whole CSS pixels so the image size does not depend on fractional layout
 * or on how a capture mode rounds.
 */
export function snap(r: Rect): Rect {
  const x1 = Math.floor(r.x);
  const y1 = Math.floor(r.y);
  const x2 = Math.ceil(r.x + r.width);
  const y2 = Math.ceil(r.y + r.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

/** The capture region: union of the rects, plus padding, limited to the page, on whole pixels. */
export function region(rects: Rect[], padding: number, pageWidth: number, pageHeight: number): Rect {
  return snap(clamp(pad(union(rects), padding), pageWidth, pageHeight));
}

/**
 * Scroll offset that brings `r` fully into a viewport of the given size, moving as little
 * as possible. Assumes the region fits (width/height no larger than the viewport).
 */
export function scrollToFit(
  r: Rect,
  scroll: { x: number; y: number },
  vw: number,
  vh: number,
): { x: number; y: number } {
  const axis = (start: number, size: number, cur: number, view: number) =>
    start < cur ? start : start + size > cur + view ? start + size - view : cur;
  return { x: axis(r.x, r.width, scroll.x, vw), y: axis(r.y, r.height, scroll.y, vh) };
}
