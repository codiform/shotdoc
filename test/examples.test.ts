import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, test } from 'vitest';
import { loadConfig } from '../src/config.js';
import { parseDocument } from '../src/parse/document.js';

const root = join(import.meta.dirname, '..');
const examplesDir = join(root, 'examples');

/** Every `examples/<name>/input/*.md`, paired with the example directory that holds its config. */
const documents = readdirSync(examplesDir)
  .map((name) => join(examplesDir, name))
  .filter((dir) => statSync(dir).isDirectory())
  .flatMap((dir) => {
    const input = join(dir, 'input');
    try {
      return readdirSync(input)
        .filter((f) => f.endsWith('.md'))
        .map((f) => ({ dir, file: join(input, f) }));
    } catch {
      return [];
    }
  });

test('there is at least one example document', () => {
  expect(documents.length).toBeGreaterThan(0);
});

describe.each(documents)('$file', ({ dir, file }) => {
  const config = loadConfig(dir); // the config next to the example, as `shotdoc build` would read it
  const source = readFileSync(file, 'utf8');
  const label = relative(root, file);

  test('is valid with its own configuration', () => {
    const blocks = parseDocument(source, label, { baseUrl: config.baseUrl });
    expect(blocks.length).toBeGreaterThan(0);
  });

  test('validation fails when a step is broken', () => {
    const broken = source.replace('```shotdoc\n', '```shotdoc\n- swipe: nowhere\n');
    expect(() => parseDocument(broken, label, { baseUrl: config.baseUrl })).toThrow(/unsupported step `swipe`/);
  });
});
