import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import type { Config } from '../../src/config.js';
import { parseDocument } from '../../src/parse/document.js';
import { runDocument } from '../../src/run/run.js';
import { md, testConfig } from './run.js';

export type Image = PNG;

/** Runs steps (one block) and returns the decoded PNGs by screenshot name. */
export async function shoot(
  baseUrl: string,
  steps: string | string[],
  over: Partial<Config> = {},
): Promise<Record<string, Image>> {
  const config = testConfig(baseUrl, over);
  const blocks = parseDocument(md(...[steps].flat()), 'doc.md', { baseUrl });
  const stageDir = mkdtempSync(join(tmpdir(), 'shotdoc-shot-'));
  try {
    const result = await runDocument(blocks, { config, file: 'doc.md', stageDir });
    const out: Record<string, Image> = {};
    for (const shots of result.values()) {
      for (const s of shots) out[s.name] = PNG.sync.read(readFileSync(s.path));
    }
    return out;
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}

export function pixel(img: Image, x: number, y: number): [number, number, number] {
  const i = (img.width * y + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!];
}

export function everyPixelIs(img: Image, rgb: [number, number, number]): boolean {
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] !== rgb[0] || img.data[i + 1] !== rgb[1] || img.data[i + 2] !== rgb[2]) return false;
  }
  return true;
}

/**
 * True when the image is a `fill` rectangle with a `border` ring `px` device pixels wide on every
 * side. The fixtures give solid elements a 1px black inset border, so an exact crop shows the ring
 * at the image edge and the image is never one colour.
 */
export function solidWithBorder(
  img: Image,
  fill: [number, number, number],
  border: [number, number, number] = [0, 0, 0],
  px = 2,
): boolean {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const onRing = x < px || y < px || x >= img.width - px || y >= img.height - px;
      const want = onRing ? border : fill;
      const i = (img.width * y + x) * 4;
      if (img.data[i] !== want[0] || img.data[i + 1] !== want[1] || img.data[i + 2] !== want[2]) return false;
    }
  }
  return true;
}

/** Number of pixels that are exactly this colour. */
export function countPixels(img: Image, rgb: [number, number, number]): number {
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] === rgb[0] && img.data[i + 1] === rgb[1] && img.data[i + 2] === rgb[2]) n++;
  }
  return n;
}
