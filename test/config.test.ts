import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { loadConfig } from '../src/config.js';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'shotdoc-cfg-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const write = (s: string) => writeFileSync(join(dir, 'shotdoc.config.yaml'), s);

test('absent file equals defaults', () => {
  expect(loadConfig(dir)).toEqual({
    outDir: join(dir, 'build'),
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
});

test('empty file equals defaults', () => {
  write('');
  expect(loadConfig(dir).viewport).toEqual({ width: 1280, height: 800 });
});

test('overrides', () => {
  write('baseUrl: https://example.test\noutDir: out\nviewport: {width: 800, height: 600}\ndeviceScaleFactor: 1\n');
  expect(loadConfig(dir)).toEqual({
    baseUrl: 'https://example.test',
    outDir: join(dir, 'out'),
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
  });
});

test('partial viewport keeps the other default', () => {
  write('viewport: {width: 900}');
  expect(loadConfig(dir).viewport).toEqual({ width: 900, height: 800 });
});

test('unknown key is named', () => {
  write('colour: red\n');
  expect(() => loadConfig(dir)).toThrow(/unknown configuration key `colour`/);
});

test('unknown nested key is named', () => {
  write('viewport: {depth: 3}\n');
  expect(() => loadConfig(dir)).toThrow(/viewport\.depth/);
});

test('invalid values', () => {
  write('baseUrl: not a url\n');
  expect(() => loadConfig(dir)).toThrow(/baseUrl/);
  write('deviceScaleFactor: 0\n');
  expect(() => loadConfig(dir)).toThrow(/deviceScaleFactor/);
});
