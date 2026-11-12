import { describe, expect, test } from 'vitest';
import { isAbsoluteUrl, resolveGoto } from '../src/url.js';

describe('resolveGoto', () => {
  test.each([
    // base without a path
    ['https://example.test', '/login', 'https://example.test/login'],
    ['https://example.test', '/', 'https://example.test/'],
    ['https://example.test', 'login', 'https://example.test/login'],
    // the context root is the base URL itself
    ['https://example.test/todos/', '/', 'https://example.test/todos/'],
    ['https://example.test/todos', '/', 'https://example.test/todos/'],
    ['https://example.test/todos', './', 'https://example.test/todos/'],
    // paths stay under the base path, with or without its trailing slash
    ['https://example.test/todos/', '/login', 'https://example.test/todos/login'],
    ['https://example.test/todos', '/login', 'https://example.test/todos/login'],
    ['https://example.test/todos/', 'login', 'https://example.test/todos/login'],
    ['https://example.test/todos', './login', 'https://example.test/todos/login'],
    // query strings and fragments come through
    ['https://example.test/todos/', '/?tab=2', 'https://example.test/todos/?tab=2'],
    ['https://example.test/todos', '/a/b?x=1#top', 'https://example.test/todos/a/b?x=1#top'],
    // absolute URLs are used as written
    ['https://example.test/todos/', 'https://other.test/page', 'https://other.test/page'],
    ['https://example.test/todos/', 'http://localhost:3000/x', 'http://localhost:3000/x'],
  ])('base %s, goto %s -> %s', (base, value, expected) => {
    expect(resolveGoto(value, base)).toBe(expected);
  });

  test('without a base URL the value is returned as written', () => {
    expect(resolveGoto('https://other.test/p', undefined)).toBe('https://other.test/p');
  });
});

test.each([
  ['https://x.test', true],
  ['http://x.test/p', true],
  ['file:///tmp/a.html', true],
  ['/login', false],
  ['./login', false],
  ['login', false],
])('isAbsoluteUrl(%s) is %s', (u, expected) => {
  expect(isAbsoluteUrl(u)).toBe(expected);
});
