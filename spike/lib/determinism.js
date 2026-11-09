// Run a scenario twice in separate browser launches and compare the PNGs.
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { launch, newStableContext } from './render.js';

const outPath = (name, n) => new URL(`../out/${name}.run${n}.png`, import.meta.url).pathname;

// scenario: async (page, path) => void  -- must write a PNG to `path`
export async function runTwice(name, scenario, { ctxOpts = {} } = {}) {
  const files = [];
  for (const n of [1, 2]) {
    const browser = await launch();
    try {
      const page = await (await newStableContext(browser, ctxOpts)).newPage();
      const path = outPath(name, n);
      await scenario(page, path, n);
      files.push(path);
    } finally {
      await browser.close();
    }
  }
  return compare(files[0], files[1]);
}

// Reports differing pixels at exact (threshold 0) and small tolerance (0.1, AA ignored).
export function compare(fileA, fileB) {
  const bufA = readFileSync(fileA), bufB = readFileSync(fileB);
  const a = PNG.sync.read(bufA), b = PNG.sync.read(bufB);
  const result = {
    files: [fileA, fileB],
    byteIdentical: bufA.equals(bufB),
    sizeA: [a.width, a.height],
    sizeB: [b.width, b.height],
  };
  if (a.width !== b.width || a.height !== b.height) {
    return { ...result, sizeMismatch: true, exactDiff: null, tolerantDiff: null, total: null };
  }
  const total = a.width * a.height;
  const run = (opts) => pixelmatch(a.data, b.data, undefined, a.width, a.height, opts);
  return {
    ...result,
    sizeMismatch: false,
    total,
    exactDiff: run({ threshold: 0, includeAA: true }),
    tolerantDiff: run({ threshold: 0.1, includeAA: false }),
  };
}

// Guard against "identical because blank": number of distinct RGB values in an image.
export function colorVariety(file) {
  const png = PNG.sync.read(readFileSync(file));
  const seen = new Set();
  for (let i = 0; i < png.data.length; i += 4) seen.add((png.data[i] << 16) | (png.data[i + 1] << 8) | png.data[i + 2]);
  return seen.size;
}
