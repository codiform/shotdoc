import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { build } from '../src/build.js';
import { startFixtureServer, type FixtureServer } from './helpers/server.js';

let server: FixtureServer;
let cwd: string;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'shotdoc-build-'));
  writeFileSync(join(cwd, 'shotdoc.config.yaml'), `baseUrl: ${server.url}\n`);
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

const GOOD = '# Guide\n\n```shotdoc\n- goto: /index.html\n- screenshot: {name: home}\n```\n\nEnd.\n';
const write = (name: string, text: string) => writeFileSync(join(cwd, name), text);
const tree = (dir: string): string[] =>
  existsSync(dir)
    ? readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((p) => !p.includes('/.') ).sort()
    : [];

test('writes the built file and images at the documented paths', async () => {
  write('guide.md', GOOD);
  const r = await build('guide.md', cwd);
  expect(r.builtPath).toBe(join(cwd, 'build', 'guide.md'));
  expect(readFileSync(r.builtPath, 'utf8')).toBe('# Guide\n\n![home](images/guide/home.png)\n\nEnd.\n');
  const png = PNG.sync.read(readFileSync(join(cwd, 'build', 'images', 'guide', 'home.png')));
  expect([png.width, png.height]).toEqual([2560, 1600]);
});

test('source is byte-identical after success', async () => {
  write('guide.md', GOOD);
  await build('guide.md', cwd);
  expect(readFileSync(join(cwd, 'guide.md'), 'utf8')).toBe(GOOD);
});

test('repeat builds write the same set of paths and leave no staging dirs', async () => {
  write('guide.md', GOOD);
  await build('guide.md', cwd);
  const first = tree(join(cwd, 'build'));
  await build('guide.md', cwd);
  expect(tree(join(cwd, 'build'))).toEqual(first);
  expect(readdirSync(join(cwd, 'build')).filter((n) => n.startsWith('.shotdoc-stage'))).toEqual([]);
});

test('renamed screenshots do not leave stale images', async () => {
  write('guide.md', GOOD);
  await build('guide.md', cwd);
  write('guide.md', GOOD.replace('name: home', 'name: start'));
  await build('guide.md', cwd);
  expect(readdirSync(join(cwd, 'build', 'images', 'guide'))).toEqual(['start.png']);
});

test('custom outDir', async () => {
  write('shotdoc.config.yaml', `baseUrl: ${server.url}\noutDir: docs-out\n`);
  write('guide.md', GOOD);
  await build('guide.md', cwd);
  expect(existsSync(join(cwd, 'docs-out', 'guide.md'))).toBe(true);
});

test('a failing step writes no built file and no images, and leaves source intact', async () => {
  const bad = GOOD.replace('- screenshot', '- click: "#nope"\n- screenshot');
  write('guide.md', bad);
  await expect(build('guide.md', cwd)).rejects.toThrow(/guide\.md:3 \(step 2, css=#nope\)/);
  expect(existsSync(join(cwd, 'build', 'guide.md'))).toBe(false);
  expect(existsSync(join(cwd, 'build', 'images'))).toBe(false);
  expect(readdirSync(join(cwd, 'build'))).toEqual([]);
  expect(readFileSync(join(cwd, 'guide.md'), 'utf8')).toBe(bad);
}, 30000);

test('previous output survives a failed rebuild', async () => {
  write('guide.md', GOOD);
  await build('guide.md', cwd);
  const before = readFileSync(join(cwd, 'build', 'guide.md'), 'utf8');
  write('guide.md', GOOD.replace('- screenshot', '- click: "#nope"\n- screenshot'));
  await expect(build('guide.md', cwd)).rejects.toThrow();
  expect(readFileSync(join(cwd, 'build', 'guide.md'), 'utf8')).toBe(before);
  expect(existsSync(join(cwd, 'build', 'images', 'guide', 'home.png'))).toBe(true);
}, 30000);

test('refuses when the output would overwrite the source', async () => {
  write('shotdoc.config.yaml', `baseUrl: ${server.url}\noutDir: .\n`);
  write('guide.md', GOOD);
  await expect(build('guide.md', cwd)).rejects.toThrow(/overwrite the source/);
  expect(readFileSync(join(cwd, 'guide.md'), 'utf8')).toBe(GOOD);
});

test('missing source names the path', async () => {
  await expect(build('nope.md', cwd)).rejects.toThrow(/nope\.md/);
});

test('validation errors in later blocks stop before any step runs', async () => {
  mkdirSync(join(cwd, 'sub'));
  write('sub/g.md', '```shotdoc\n- goto: /index.html\n```\n\n```shotdoc\n- hover: x\n```\n');
  await expect(build('sub/g.md', cwd)).rejects.toThrow(/sub\/g\.md:5/);
  expect(existsSync(join(cwd, 'build'))).toBe(false);
});

test('a document with no blocks builds to an identical copy', async () => {
  write('plain.md', '# Plain\r\n\r\ntext\r\n');
  const r = await build('plain.md', cwd);
  expect(readFileSync(r.builtPath, 'utf8')).toBe('# Plain\r\n\r\ntext\r\n');
});
