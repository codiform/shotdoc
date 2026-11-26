import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from 'vitest';
import { parseDocument } from '../src/parse/document.js';
import { FENCE } from './helpers/fence.js';

const readme = readFileSync(join(import.meta.dirname, '..', 'README.md'), 'utf8');

test('every shotdoc example in the README is valid', () => {
  // Each example validates on its own, and all of them together as one document would
  // collide on names, so check individually.
  const blocks = [...readme.matchAll(/^```shotdoc\n([\s\S]*?)^```$/gm)].map((m) => m[1]!);
  expect(blocks.length).toBeGreaterThanOrEqual(4);
  for (const body of blocks) {
    expect(() =>
      parseDocument(`${FENCE}shotdoc\n${body}${FENCE}\n`, 'README.md', { baseUrl: 'http://example.test' }),
    ).not.toThrow();
  }
});

test('the README documents the prerequisite and every configuration key', () => {
  expect(readme).toContain('shotdoc install');
  for (const key of ['baseUrl', 'outDir', 'viewport', 'deviceScaleFactor']) {
    expect(readme).toContain(key);
  }
});

test('the README documents the screenshot options for hiding and masking', () => {
  for (const key of ['hide', 'mask', 'maskColor']) {
    expect(readme).toContain(`\`${key}\``);
  }
  expect(readme).toContain('### Hiding and masking');
});

test('the README documents annotations: the option, each kind and the options', () => {
  expect(readme).toContain('### Annotating');
  for (const word of ['`annotate`', '`highlight`', '`arrow`', '`badge`', '`from`', '`color`']) {
    expect(readme).toContain(word);
  }
});

test('the README documents document defaults and opting out', () => {
  expect(readme).toContain('### Defaults for every screenshot');
  for (const word of ['`shotdoc.defaults`', '`defaults: false`', 'front matter', 'leaves out the `shotdoc` key']) {
    expect(readme).toContain(word);
  }
});

test('the README documents the login configuration and command', () => {
  for (const word of ['`auth`', '`shotdoc login`', '`check`', '.shotdoc/auth.json']) {
    expect(readme).toContain(word);
  }
});

test('every step in the steps table links to a heading in the README', () => {
  const headings = new Set(
    [...readme.matchAll(/^#+ (.*)$/gm)].map((m) =>
      m[1]!
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, '')
        .replaceAll(' ', '-'),
    ),
  );
  const table = readme.slice(readme.indexOf('### Steps'), readme.indexOf('### Targets'));
  const rows = [...table.matchAll(/^\| \[`(\w+)`\]\(#([^)]+)\) \|/gm)];
  expect(rows.map((m) => m[1])).toEqual([
    'goto',
    'click',
    'dblclick',
    'hover',
    'unhover',
    'fill',
    'press',
    'wait',
    'screenshot',
  ]);
  for (const [, step, anchor] of rows) {
    expect(headings.has(anchor!), `${step} links to #${anchor}`).toBe(true);
  }
});

test('the README opens with the release status and an Install section with the Node version and browser', () => {
  const top = readme.slice(0, readme.indexOf('## Example'));
  expect(top).toMatch(/Early release/);
  expect(top).toMatch(/not yet stable/);
  expect(top).toContain('## Install');
  expect(top).toContain('Node.js 22 or later');
  expect(top).toContain('npm install --save-dev shotdoc');
  expect(top).toContain('npx shotdoc install');
  expect(top).not.toContain('npx playwright install');
});

test('the README has nothing that only makes sense inside the repository checkout', () => {
  expect(readme).not.toContain('build:examples');
  expect(readme).not.toContain('](openspec/');
});
