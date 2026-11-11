import { execFileSync, spawn } from 'node:child_process';
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import MarkdownIt from 'markdown-it';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';

const root = join(import.meta.dirname, '..', '..');
let server: FixtureServer;
let cwd: string;

beforeAll(async () => {
  execFileSync('npx', ['tsc', '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'pipe' });
  server = await startFixtureServer();
  cwd = mkdtempSync(join(tmpdir(), 'shotdoc-example-'));
  writeFileSync(join(cwd, 'shotdoc.config.yaml'), `baseUrl: ${server.url}\n`);
  copyFileSync(join(import.meta.dirname, 'example.md'), join(cwd, 'example.md'));
});
afterAll(async () => {
  await server.close();
  rmSync(cwd, { recursive: true, force: true });
});

const source = () => readFileSync(join(import.meta.dirname, 'example.md'), 'utf8');

test('builds the example end to end with the real command', async () => {
  const before = readFileSync(join(cwd, 'example.md'));
  // Async spawn: the fixture server lives in this process and must keep serving.
  const r = await new Promise<{ code: number | null; stderr: string }>((resolve) => {
    const p = spawn('node', [join(root, 'dist', 'cli.js'), 'build', 'example.md'], {
      cwd,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    p.stderr.on('data', (d) => (stderr += d));
    p.on('close', (code) => resolve({ code, stderr }));
  });
  expect(r.stderr).toBe('');
  expect(r.code).toBe(0);

  // Built Markdown: blocks replaced in order, empty block removed, yaml fence and prose untouched.
  const built = readFileSync(join(cwd, 'build', 'example.md'), 'utf8');
  expect(built).toBe(
    source()
      .replace(/```shotdoc\n- goto: \/form\.html[\s\S]*?```\n/, '![The form page](images/example/form.png)\n')
      .replace(/```shotdoc\n- fill:[\s\S]*?```\n/, '![saved](images/example/saved.png)\n')
      .replace(/```shotdoc\n- goto: \/delayed\.html[\s\S]*?```\n/, '![count](images/example/count.png)\n')
      .replace(/```shotdoc\n- goto: \/menu\.html\n```\n/, '')
      .replace(/```shotdoc\n- screenshot:[\s\S]*?```\n/, '![Header with its menu open](images/example/menu.png)\n'),
  );

  // Images exist with the expected sizes.
  expect(readdirSync(join(cwd, 'build', 'images', 'example')).sort()).toEqual([
    'count.png',
    'form.png',
    'menu.png',
    'saved.png',
  ]);
  const size = (n: string) => {
    const p = PNG.sync.read(readFileSync(join(cwd, 'build', 'images', 'example', n)));
    return [p.width, p.height];
  };
  expect(size('form.png')).toEqual([2560, 1600]);
  expect(size('menu.png')).toEqual([800, 420]);

  // The source is byte-identical afterwards.
  expect(readFileSync(join(cwd, 'example.md')).equals(before)).toBe(true);
});

test('the unbuilt source renders as readable code blocks', () => {
  const html = new MarkdownIt('commonmark').render(source());
  const blocks = [...html.matchAll(/<pre><code class="language-shotdoc">([\s\S]*?)<\/code><\/pre>/g)];
  expect(blocks).toHaveLength(5);
  expect(html).toContain('- click: {role: button, name: Save}');
  expect(html).toContain('Fill in the form and save it:');
});
