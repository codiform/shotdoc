import { PNG } from 'pngjs';
import { describe, expect, test } from 'vitest';
import { blankColour } from '../../src/run/blank.js';

type Rgba = [number, number, number, number];

/** Builds a PNG buffer filled with one colour, with optional single-pixel overrides. */
function image(width: number, height: number, fill: Rgba, dots: Array<[number, number, Rgba]> = []): Buffer {
  const png = new PNG({ width, height });
  const set = (x: number, y: number, c: Rgba) => {
    const i = (width * y + x) * 4;
    png.data[i] = c[0];
    png.data[i + 1] = c[1];
    png.data[i + 2] = c[2];
    png.data[i + 3] = c[3];
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) set(x, y, fill);
  for (const [x, y, c] of dots) set(x, y, c);
  return PNG.sync.write(png);
}

describe('blankColour', () => {
  test('an all-white image is blank and says white', () => {
    expect(blankColour(image(20, 10, [255, 255, 255, 255]))).toBe('#ffffff');
  });

  test('a solid red image is blank and says red', () => {
    expect(blankColour(image(5, 5, [255, 0, 0, 255]))).toBe('#ff0000');
  });

  test('one different pixel in a large image means it is not blank', () => {
    const big = image(2560, 1600, [255, 255, 255, 255], [[2559, 1599, [254, 255, 255, 255]]]);
    expect(blankColour(big)).toBeUndefined();
  });

  test('a two-colour image is not blank', () => {
    expect(blankColour(image(4, 4, [0, 0, 0, 255], [[1, 1, [255, 255, 255, 255]]]))).toBeUndefined();
  });

  test('a difference in alpha alone is a difference', () => {
    expect(blankColour(image(3, 3, [10, 20, 30, 255], [[0, 2, [10, 20, 30, 128]]]))).toBeUndefined();
  });

  test('a one-pixel image is blank', () => {
    expect(blankColour(image(1, 1, [0, 0, 0, 255]))).toBe('#000000');
  });

  test('a fully transparent image mentions its alpha', () => {
    expect(blankColour(image(2, 2, [0, 0, 0, 0]))).toBe('#000000 with alpha 0');
  });
});
