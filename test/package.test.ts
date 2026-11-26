import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = join(import.meta.dirname, '..');

/** The files `npm pack` would put in the tarball. `--ignore-scripts` skips `prepack`, so this does not build. */
function packedFiles(): string[] {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf8' });
  const [pack] = JSON.parse(out) as { files: { path: string }[] }[];
  return pack!.files.map((f) => f.path);
}

const ALWAYS_PACKED = ['README.md', 'package.json', 'LICENSE'];

describe('the published package', () => {
  test('contains only compiled output, the README, package.json and the LICENSE', () => {
    const files = packedFiles();
    const unexpected = files.filter((f) => !f.startsWith('dist/') && !ALWAYS_PACKED.includes(f));
    expect(unexpected).toEqual([]);
    expect(files).toEqual(expect.arrayContaining(ALWAYS_PACKED));
  });

  test('never contains a saved session', () => {
    const dir = join(root, '.shotdoc');
    const file = join(dir, 'auth.json');
    // Only touch what this test creates: a real saved session here must be left alone.
    const hadDir = existsSync(dir);
    const hadFile = existsSync(file);
    try {
      if (!hadDir) {
        mkdirSync(dir);
      }
      if (!hadFile) {
        writeFileSync(file, '{"cookies":[],"origins":[]}');
      }
      expect(packedFiles().filter((f) => f.includes('.shotdoc') || f.includes('auth.json'))).toEqual([]);
    } finally {
      if (!hadFile) {
        rmSync(file, { force: true });
      }
      if (!hadDir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  test('declares its license, repository and Node version', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('shotdoc');
    expect(pkg.license).toBe('MIT');
    expect(pkg.repository.url).toContain('github.com/codiform/shotdoc');
    expect(pkg.homepage).toBeTruthy();
    expect(pkg.bugs.url).toBeTruthy();
    expect(pkg.engines.node).toBe('>=22');
    expect(readFileSync(join(root, 'LICENSE'), 'utf8')).toContain('Copyright (c) 2026 Codiform');
  });

  test('is below 1.0.0 until the project calls it stable', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(Number(pkg.version.split('.')[0])).toBe(0);
  });

  test('builds before it is packed and runs the tests before it is published', () => {
    const { scripts } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    expect(scripts.prepack).toContain('build');
    expect(scripts.prepublishOnly).toContain('test');
  });
});
