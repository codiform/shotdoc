import { expect, test } from 'vitest';
import { findBlocks } from '../../src/parse/blocks.js';

const f = (s: string) => findBlocks(s, 'a.md');

test('recognises a top-level shotdoc block with its line range', () => {
  const { blocks, errors } = f('# T\n\ntext\n\n```shotdoc\n- goto: /\n```\n\nafter\n');
  expect(errors).toEqual([]);
  expect(blocks).toHaveLength(1);
  expect(blocks[0]).toMatchObject({ line: 5, startLine: 4, endLine: 7, body: '- goto: /\n' });
});

test('ignores other languages, including yaml', () => {
  const { blocks, errors } = f('```yaml\n- goto: /\n```\n\n```\nplain\n```\n\n```shotdocish\nx\n```\n');
  expect(blocks).toEqual([]);
  expect(errors).toEqual([]);
});

test('rejects a block inside a list item', () => {
  const { blocks, errors } = f('- item\n\n  ```shotdoc\n  - goto: /\n  ```\n');
  expect(blocks).toEqual([]);
  expect(errors[0]?.message).toMatch(/a\.md:3.*top level/);
});

test('rejects a block inside a blockquote', () => {
  const { errors } = f('> ```shotdoc\n> - goto: /\n> ```\n');
  expect(errors[0]?.message).toMatch(/a\.md:1.*top level/);
});

test('accepts a block after a list', () => {
  const { blocks, errors } = f('- one\n- two\n\n```shotdoc\n- goto: /\n```\n');
  expect(errors).toEqual([]);
  expect(blocks).toHaveLength(1);
});

test.each(['js', 'state=fresh', 'save=admin'])('reserved attribute %s is not supported yet', (attr) => {
  const { blocks, errors } = f(`intro\n\n\`\`\`shotdoc ${attr}\n- goto: /\n\`\`\`\n`);
  expect(blocks).toEqual([]);
  expect(errors[0]?.message).toBe(`a.md:3: attribute \`${attr}\` is not supported yet`);
});

test('unknown attribute is named', () => {
  const { errors } = f('```shotdoc fast\n- goto: /\n```\n');
  expect(errors[0]?.message).toBe('a.md:1: unknown attribute `fast`');
});
