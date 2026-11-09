import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Config } from '../../src/config.js';
import { parseDocument } from '../../src/parse/document.js';
import { runDocument } from '../../src/run/run.js';
import type { Shot } from '../../src/run/steps.js';

export function testConfig(baseUrl: string, over: Partial<Config> = {}): Config {
  return {
    baseUrl,
    outDir: join(tmpdir(), 'shotdoc-unused'),
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
    ...over,
  };
}

/** Wraps steps (YAML) in shotdoc fences, one block per entry. */
export const md = (...blocks: string[]) => blocks.map((b) => '```shotdoc\n' + b.trim() + '\n```\n').join('\ntext\n\n');

/** Parses and runs a Markdown document against a base URL; always cleans its stage dir. */
export async function runMd(
  source: string,
  baseUrl: string,
  over: Partial<Config> = {},
): Promise<{ shots: Map<number, Shot[]>; read: <T>(fn: (stageDir: string) => Promise<T> | T) => Promise<T> }> {
  const config = testConfig(baseUrl, over);
  const blocks = parseDocument(source, 'doc.md', { baseUrl: config.baseUrl });
  const stageDir = mkdtempSync(join(tmpdir(), 'shotdoc-test-'));
  try {
    const shots = await runDocument(blocks, { config, file: 'doc.md', stageDir });
    return { shots, read: async (fn) => fn(stageDir) };
  } finally {
    // Images are read by the caller through `read` only when needed; clean on next tick.
    setTimeout(() => rmSync(stageDir, { recursive: true, force: true }), 5000).unref();
  }
}
