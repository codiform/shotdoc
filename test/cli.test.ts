import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { type FixtureServer, startFixtureServer } from './helpers/server.js';

const root = join(import.meta.dirname, '..');
const cli = join(root, 'dist', 'cli.js');
let server: FixtureServer;
let cwd: string;

beforeAll(async () => {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'pipe' });
  server = await startFixtureServer();
});
afterAll(() => server.close());
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'shotdoc-cli-'));
  writeFileSync(join(cwd, 'shotdoc.config.yaml'), `baseUrl: ${server.url}\n`);
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

function run(args: string[], env: Record<string, string> = {}): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve) => {
    // stdin is closed: a build must never wait for input.
    const p = spawn('node', [cli, ...args], {
      cwd,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => resolve({ code: code ?? -1, out, err }));
  });
}
const write = (n: string, t: string) => writeFileSync(join(cwd, n), t);
const GOOD = '```shotdoc\n- goto: /index.html\n- screenshot: {name: home}\n```\n';

test('success exits zero and writes output', async () => {
  write('g.md', GOOD);
  const r = await run(['build', 'g.md']);
  expect(r.code).toBe(0);
  expect(r.out).toMatch(/Built build\/g\.md \(1 image\)/);
  expect(readFileSync(join(cwd, 'build', 'g.md'), 'utf8')).toBe('![home](images/g/home.png)\n');
});

test('validation failure: non-zero, every error listed, nothing written', async () => {
  write('g.md', '```shotdoc\n- swipe: a\n```\n\n```shotdoc fast\n- goto: /\n```\n');
  const r = await run(['build', 'g.md']);
  expect(r.code).toBe(1);
  expect(r.err).toMatch(/error: g\.md:1 \(step 1\): unsupported step `swipe`/);
  expect(r.err).toMatch(/error: g\.md:5: unknown attribute `fast`/);
  expect(existsSync(join(cwd, 'build'))).toBe(false);
});

test('step failure: non-zero, location in message, no built file', async () => {
  write('g.md', '```shotdoc\n- goto: /missing.html\n```\n');
  const r = await run(['build', 'g.md']);
  expect(r.code).toBe(1);
  expect(r.err).toContain('g.md:1 (step 1');
  expect(r.err).toContain('404');
  expect(existsSync(join(cwd, 'build', 'g.md'))).toBe(false);
});

test('missing source file', async () => {
  const r = await run(['build', 'nope.md']);
  expect(r.code).toBe(1);
  expect(r.err).toContain('nope.md');
});

test('usage errors exit 2', async () => {
  expect((await run([])).code).toBe(2);
  expect((await run(['build'])).code).toBe(2);
  expect((await run(['--help'])).code).toBe(0);
});

test('missing Chromium gives the install command', async () => {
  write('g.md', GOOD);
  const empty = mkdtempSync(join(tmpdir(), 'shotdoc-nobrowser-'));
  try {
    const r = await run(['build', 'g.md'], { PLAYWRIGHT_BROWSERS_PATH: empty });
    expect(r.code).toBe(1);
    expect(r.err).toContain('npx playwright install chromium');
    expect(existsSync(join(cwd, 'build', 'g.md'))).toBe(false);
  } finally {
    rmSync(empty, { recursive: true, force: true });
  }
});
