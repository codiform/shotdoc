import { expect, test, vi } from 'vitest';
import type { ShotdocErrors } from '../../src/errors.js';
import { parseDocument } from '../../src/parse/document.js';

const base = { baseUrl: 'https://example.test' };

test('parses all blocks', () => {
  const blocks = parseDocument(
    '```shotdoc\n- goto: /\n```\n\ntext\n\n```shotdoc\n- screenshot: {name: a}\n```\n',
    'a.md',
    base,
  );
  expect(blocks.map((b) => b.line)).toEqual([1, 7]);
});

function errorsOf(src: string): string[] {
  try {
    parseDocument(src, 'a.md', base);
  } catch (e) {
    return (e as ShotdocErrors).errors.map((x) => x.message);
  }
  return [];
}

test('reports problems from different blocks together', () => {
  const m = errorsOf('```shotdoc\n- swipe: x\n```\n\n```shotdoc state=fresh\n- goto: /\n```\n');
  expect(m).toHaveLength(2);
  expect(m[0]).toMatch(/a\.md:1 \(step 1\).*swipe/);
  expect(m[1]).toMatch(/a\.md:5.*state=fresh/);
});

test('duplicate screenshot names across blocks name both lines', () => {
  const m = errorsOf('```shotdoc\n- screenshot: {name: x}\n```\n\n```shotdoc\n- screenshot: {name: x}\n```\n');
  expect(m).toHaveLength(1);
  expect(m[0]).toMatch(/a\.md:5 \(step 1\).*`x`.*line 1/);
});

test('validation does not touch a browser', async () => {
  const pw = await import('playwright');
  const spy = vi.spyOn(pw.chromium, 'launch');
  errorsOf('```shotdoc\n- swipe: x\n```\n');
  expect(spy).not.toHaveBeenCalled();
  spy.mockRestore();
});
