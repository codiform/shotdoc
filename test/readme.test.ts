import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parseDocument } from '../src/parse/document.js';

const readme = readFileSync(join(import.meta.dirname, '..', 'README.md'), 'utf8');

test('every shotdoc example in the README is valid', () => {
  // Each example validates on its own, and all of them together as one document would
  // collide on names, so check individually.
  const blocks = [...readme.matchAll(/^```shotdoc\n([\s\S]*?)^```$/gm)].map((m) => m[1]!);
  expect(blocks.length).toBeGreaterThanOrEqual(4);
  for (const body of blocks) {
    expect(() =>
      parseDocument('```shotdoc\n' + body + '```\n', 'README.md', { baseUrl: 'http://example.test' }),
    ).not.toThrow();
  }
});

test('the README documents the prerequisite and every configuration key', () => {
  expect(readme).toContain('npx playwright install chromium');
  for (const key of ['baseUrl', 'outDir', 'viewport', 'deviceScaleFactor']) expect(readme).toContain(key);
});

test('the README documents the screenshot options for hiding and masking', () => {
  for (const key of ['hide', 'mask', 'maskColor']) expect(readme).toContain(`\`${key}\``);
  expect(readme).toContain('### Hiding and masking');
});

test('the README documents annotations: the option, each kind and the options', () => {
  expect(readme).toContain('### Annotating');
  for (const word of ['`annotate`', '`highlight`', '`arrow`', '`badge`', '`from`', '`color`']) {
    expect(readme).toContain(word);
  }
});
