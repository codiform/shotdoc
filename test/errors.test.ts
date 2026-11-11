import { expect, test } from 'vitest';
import { formatError, ShotdocError } from '../src/errors.js';

test('full location', () => {
  expect(formatError('element not found', { file: 'guide.md', blockLine: 12, step: 3, target: 'button "Save"' })).toBe(
    'guide.md:12 (step 3, button "Save"): element not found',
  );
});

test('without step and target', () => {
  expect(formatError('unknown attribute `fast`', { file: 'guide.md', blockLine: 7 })).toBe(
    'guide.md:7: unknown attribute `fast`',
  );
});

test('step without target', () => {
  expect(formatError('bad', { file: 'a.md', blockLine: 1, step: 2 })).toBe('a.md:1 (step 2): bad');
});

test('reason only', () => {
  expect(formatError('boom')).toBe('boom');
});

test('withLocation fills gaps without overriding', () => {
  const e = new ShotdocError('x', { step: 2 }).withLocation({ file: 'a.md', blockLine: 5, step: 9 });
  expect(e.message).toBe('a.md:5 (step 2): x');
});
