import { expect, test } from 'vitest';
import { buildDocument } from '../src/emit.js';
import { parseDocument } from '../src/parse/document.js';
import type { Shot } from '../src/run/steps.js';

const ref = (n: string) => `images/doc/${n}.png`;
const shot = (name: string, alt?: string): Shot => ({ name, alt, path: `/x/${name}.png` });
const make = (src: string, shots: Record<number, Shot[]>) =>
  buildDocument(src, parseDocument(src, 'doc.md', { baseUrl: 'http://x.test' }), new Map(Object.entries(shots).map(([k, v]) => [Number(k), v])), ref);

test('block with two screenshots, in order, name used when no alt', () => {
  const src = '# T\n\n```shotdoc\n- goto: /\n- screenshot: {name: home}\n- screenshot: {name: login, alt: Login form}\n```\n\nafter\n';
  expect(make(src, { 3: [shot('home'), shot('login', 'Login form')] })).toBe(
    '# T\n\n![home](images/doc/home.png)\n\n![Login form](images/doc/login.png)\n\nafter\n',
  );
});

test('block with none is removed and surroundings are untouched', () => {
  const src = 'before\n\n```shotdoc\n- goto: /\n```\n\nafter\n';
  expect(make(src, { 3: [] })).toBe('before\n\n\nafter\n');
});

test('non-shotdoc fences are untouched', () => {
  const src = '```yaml\n- goto: /\n```\n\n```shotdoc\n- goto: /\n- screenshot: {name: a}\n```\n\n```js\nx\n```\n';
  expect(make(src, { 5: [shot('a')] })).toBe('```yaml\n- goto: /\n```\n\n![a](images/doc/a.png)\n\n```js\nx\n```\n');
});

test('CRLF line endings are preserved, including in generated lines', () => {
  const src = 'a\r\n\r\n```shotdoc\r\n- goto: /\r\n- screenshot: {name: a}\r\n- screenshot: {name: b}\r\n```\r\n\r\nz\r\n';
  expect(make(src, { 3: [shot('a'), shot('b')] })).toBe(
    'a\r\n\r\n![a](images/doc/a.png)\r\n\r\n![b](images/doc/b.png)\r\n\r\nz\r\n',
  );
});

test('a block ending the file without a newline', () => {
  const src = 'x\n\n```shotdoc\n- goto: /\n- screenshot: {name: a}\n```';
  expect(make(src, { 3: [shot('a')] })).toBe('x\n\n![a](images/doc/a.png)');
});

test('alt text brackets are escaped', () => {
  const src = '```shotdoc\n- goto: /\n- screenshot: {name: a}\n```\n';
  expect(make(src, { 1: [shot('a', 'see [1]')] })).toBe('![see \\[1\\]](images/doc/a.png)\n');
});

test('a document without blocks is returned unchanged', () => {
  const src = '# Just text\r\n\r\nno blocks';
  expect(make(src, {})).toBe(src);
});
