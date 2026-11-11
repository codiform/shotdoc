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

/** Number of pixels that are exactly this colour. */
export function countPixels(img: Image, rgb: [number, number, number]): number {
  let n = 0;
  for (let i = 0; i < img.data.length; i += 4) {
    if (img.data[i] === rgb[0] && img.data[i + 1] === rgb[1] && img.data[i + 2] === rgb[2]) n++;
  }
  return n;
}
