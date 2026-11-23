import { expect, test, vi } from 'vitest';
import type { ShotdocErrors } from '../../src/errors.js';
import { parseDocument } from '../../src/parse/document.js';
import { FENCE } from '../helpers/fence.js';

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

const FRONT = '---\ntitle: Guide\nshotdoc:\n  defaults:\n    hide: [{text: Demo}]\n    maskColor: "#333"\n---\n\n';
const BLOCK = '```shotdoc\n- screenshot: {name: a}\n```\n';

test('front matter defaults reach every screenshot in every block', () => {
  const blocks = parseDocument(`${FRONT}${BLOCK}\n${BLOCK.replace('name: a', 'name: b')}`, 'a.md', base);
  const shots = blocks.flatMap((b) => b.steps);
  expect(shots).toHaveLength(2);
  for (const s of shots) {
    expect(s).toMatchObject({ defaults: { hide: [{ kind: 'text', text: 'Demo' }], maskColor: '#333' } });
  }
});

test('block lines are counted from the top of the file, front matter included', () => {
  const blocks = parseDocument(`${FRONT}${BLOCK}`, 'a.md', base);
  expect(blocks[0]?.line).toBe(9);
  expect(errorsOf(`${FRONT}${FENCE}shotdoc\n- swipe: x\n${FENCE}\n`)[0]).toMatch(/^a\.md:9 \(step 1\)/);
});

test('a document without front matter parses as before', () => {
  const blocks = parseDocument(BLOCK, 'a.md', base);
  expect(blocks[0]?.steps[0]).toMatchObject({ defaults: { hide: [], mask: [] } });
});

test('a front matter error stops the build, and is reported with block errors', () => {
  const m = errorsOf(`---\nshotdoc: {defalts: {}}\n---\n\n${FENCE}shotdoc\n- swipe: x\n${FENCE}\n`);
  expect(m).toHaveLength(2);
  expect(m[0]).toMatch(/^a\.md: the front matter `shotdoc` has unknown key `defalts`/);
  expect(m[1]).toMatch(/^a\.md:5 \(step 1\).*swipe/);
});
