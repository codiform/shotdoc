import { expect, test } from 'vitest';
import { clamp, pad, region, scrollToFit, snap, union } from '../src/run/region.js';

test('padding extends every side', () => {
  expect(region([{ x: 100, y: 100, width: 50, height: 20 }], 16, 1000, 1000)).toEqual({
    x: 84,
    y: 84,
    width: 82,
    height: 52,
  });
});

test('corner element with padding 20 starts at the page edge', () => {
  expect(region([{ x: 0, y: 0, width: 100, height: 50 }], 20, 1280, 800)).toEqual({
    x: 0,
    y: 0,
    width: 120,
    height: 70,
  });
});

test('clamps at the far edges too', () => {
  expect(clamp({ x: 1200, y: 760, width: 200, height: 100 }, 1280, 800)).toEqual({ x: 1200, y: 760, width: 80, height: 40 });
});

test('fractional width 82.39 is rounded outward to whole pixels', () => {
  const r = region([{ x: 40.3, y: 10, width: 82.39, height: 30 }], 16, 1280, 800);
  for (const v of Object.values(r)) expect(Number.isInteger(v)).toBe(true);
  expect(r.width).toBeGreaterThanOrEqual(114.39);
  expect(r.width).toBeLessThanOrEqual(116);
  // outward: covers the padded element completely
  expect(r.x).toBeLessThanOrEqual(24.3);
  expect(r.x + r.width).toBeGreaterThanOrEqual(138.69);
});

test('union of several regions', () => {
  expect(union([{ x: 20, y: 20, width: 400, height: 40 }, { x: 20, y: 80, width: 200, height: 150 }])).toEqual({
    x: 20,
    y: 20,
    width: 400,
    height: 210,
  });
});

test('snap and pad compose as pure functions', () => {
  expect(snap({ x: 1.2, y: 1.8, width: 2.1, height: 1 })).toEqual({ x: 1, y: 1, width: 3, height: 2 });
  expect(pad({ x: 5, y: 5, width: 5, height: 5 }, 2)).toEqual({ x: 3, y: 3, width: 9, height: 9 });
});

test('scrollToFit moves the minimum', () => {
  const vp = [1280, 800] as const;
  expect(scrollToFit({ x: 0, y: 700, width: 200, height: 150 }, { x: 0, y: 0 }, ...vp)).toEqual({ x: 0, y: 50 });
  expect(scrollToFit({ x: 0, y: 100, width: 200, height: 150 }, { x: 0, y: 0 }, ...vp)).toEqual({ x: 0, y: 0 });
  expect(scrollToFit({ x: 0, y: 100, width: 200, height: 150 }, { x: 0, y: 500 }, ...vp)).toEqual({ x: 0, y: 100 });
});
