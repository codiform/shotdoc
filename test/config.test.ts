import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { CONFIG_FILE, findConfig, loadConfig as load } from '../src/config.js';

let dir: string;
beforeEach(() => {
  dir = realpathSync(mkdtempSync(join(tmpdir(), 'shotdoc-cfg-')));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const write = (s: string) => writeFileSync(join(dir, CONFIG_FILE), s);
/** Loads the config in `dir` the way the build does when run from `dir`. */
const loadConfig = (_cwd: string) => load(existsSync(join(dir, CONFIG_FILE)) ? join(dir, CONFIG_FILE) : undefined, dir);

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

describe('findConfig', () => {
  const put = (rel: string, text = '') => {
    mkdirSync(join(dir, rel, '..'), { recursive: true });
    writeFileSync(join(dir, rel), text);
    return join(dir, rel);
  };

  test('finds a config above the source file, from another working directory', () => {
    const cfg = put('examples/demo/shotdoc.config.yaml');
    put('examples/demo/input/doc.md');
    expect(findConfig('examples/demo/input/doc.md', dir)).toBe(cfg);
  });

  test('the nearest config wins', () => {
    put('examples/demo/shotdoc.config.yaml');
    const near = put('examples/demo/input/shotdoc.config.yaml');
    expect(findConfig('examples/demo/input/doc.md', dir)).toBe(near);
  });

  test('a named config overrides discovery and resolves against the working directory', () => {
    put('examples/demo/shotdoc.config.yaml');
    const shared = put('shared/shotdoc.config.yaml');
    expect(findConfig('examples/demo/input/doc.md', dir, 'shared/shotdoc.config.yaml')).toBe(shared);
  });

  test('a missing named config fails and names the path', () => {
    expect(() => findConfig('doc.md', dir, 'nope/shotdoc.config.yaml')).toThrow(
      /not found: nope\/shotdoc\.config\.yaml/,
    );
  });

  test('a named directory is not a config file', () => {
    mkdirSync(join(dir, 'somedir'));
    expect(() => findConfig('doc.md', dir, 'somedir')).toThrow(/not found: somedir/);
  });

  test('falls back to the working directory when none is above the source', () => {
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'shotdoc-elsewhere-')));
    try {
      const cfg = put('shotdoc.config.yaml');
      expect(findConfig(join(outside, 'doc.md'), dir)).toBe(cfg);
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  test('is undefined when there is no config anywhere', () => {
    const outside = realpathSync(mkdtempSync(join(tmpdir(), 'shotdoc-elsewhere-')));
    try {
      expect(findConfig('doc.md', outside)).toBeUndefined();
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

describe('loadConfig with a file path', () => {
  test('a relative outDir lands beside the config file, wherever the build runs from', () => {
    mkdirSync(join(dir, 'examples/demo'), { recursive: true });
    const cfg = join(dir, 'examples/demo/shotdoc.config.yaml');
    writeFileSync(cfg, 'outDir: output\n');
    expect(load(cfg, dir).outDir).toBe(join(dir, 'examples/demo/output'));
  });

  test('the default outDir with no file is under the working directory', () => {
    expect(load(undefined, dir).outDir).toBe(join(dir, 'build'));
  });

  test('errors name the file relative to the working directory', () => {
    mkdirSync(join(dir, 'examples/demo'), { recursive: true });
    const cfg = join(dir, 'examples/demo/shotdoc.config.yaml');
    writeFileSync(cfg, 'colour: red\n');
    expect(() => load(cfg, dir)).toThrow(/examples\/demo\/shotdoc\.config\.yaml/);
  });

  test('an unreadable path fails with a message naming it', () => {
    mkdirSync(join(dir, 'asdir'));
    expect(() => load(join(dir, 'asdir'), dir)).toThrow(/cannot read the configuration file/);
  });
});

describe('auth', () => {
  const AUTH =
    'baseUrl: https://app.test/\nauth:\n  url: /login\n  check: {url: /secure, visible: {role: heading, name: Secure Area}}\n';

  test('a valid login is resolved against baseUrl', () => {
    write(AUTH);
    expect(loadConfig(dir).auth).toEqual({
      url: 'https://app.test/login',
      check: {
        url: 'https://app.test/secure',
        condition: { kind: 'visible', target: { kind: 'role', role: 'heading', name: 'Secure Area' } },
      },
      state: join(dir, '.shotdoc/auth.json'),
      configName: CONFIG_FILE,
    });
  });

  test('check.url defaults to auth.url and text is a condition', () => {
    write('baseUrl: https://app.test\nauth: {url: /home, check: {text: Sign out}}\n');
    const auth = loadConfig(dir).auth;
    expect(auth?.check).toEqual({ url: 'https://app.test/home', condition: { kind: 'text', text: 'Sign out' } });
  });

  test('state is resolved against the configuration directory', () => {
    write(`${AUTH}  state: secrets/login.json\n`);
    expect(loadConfig(dir).auth?.state).toBe(join(dir, 'secrets/login.json'));
  });

  test('a config without auth has none', () => {
    write('baseUrl: https://app.test\n');
    expect(loadConfig(dir)).not.toHaveProperty('auth');
  });

  test('a missing url fails', () => {
    write('auth: {check: {text: x}}\n');
    expect(() => loadConfig(dir)).toThrow(/`auth` needs a `url`/);
  });

  test('a missing check fails and says a check is required', () => {
    write('baseUrl: https://app.test\nauth: {url: /login}\n');
    expect(() => loadConfig(dir)).toThrow(/needs a `check`/);
  });

  test('both visible and text fail, as does neither', () => {
    write('baseUrl: https://app.test\nauth: {url: /login, check: {visible: h1, text: x}}\n');
    expect(() => loadConfig(dir)).toThrow(/exactly one of `visible` or `text`/);
    write('baseUrl: https://app.test\nauth: {url: /login, check: {url: /x}}\n');
    expect(() => loadConfig(dir)).toThrow(/exactly one of `visible` or `text`/);
  });

  test('unknown keys are named at each level', () => {
    write('baseUrl: https://app.test\nauth: {url: /login, check: {text: x}, user: me}\n');
    expect(() => loadConfig(dir)).toThrow(/`auth` has unknown key `user` \(allowed: url, check, state\)/);
    write('baseUrl: https://app.test\nauth: {url: /login, check: {hidden: x}}\n');
    expect(() => loadConfig(dir)).toThrow(/`auth.check` has unknown key `hidden`/);
  });

  test('a malformed target or value fails', () => {
    write('baseUrl: https://app.test\nauth: {url: /login, check: {visible: {role: heading, colour: red}}}\n');
    expect(() => loadConfig(dir)).toThrow(/auth\.check\.visible/);
    write('baseUrl: https://app.test\nauth: {url: /login, check: {text: ""}}\n');
    expect(() => loadConfig(dir)).toThrow(/auth\.check\.text/);
    write('baseUrl: https://app.test\nauth: {url: /login, check: {text: x}, state: 3}\n');
    expect(() => loadConfig(dir)).toThrow(/auth\.state/);
    write('auth: nope\n');
    expect(() => loadConfig(dir)).toThrow(/`auth` must be a mapping/);
  });

  test('a relative url without a baseUrl fails; an absolute one is fine', () => {
    write('auth: {url: /login, check: {text: x}}\n');
    expect(() => loadConfig(dir)).toThrow(/relative URL/);
    write('auth: {url: "https://a.test/login", check: {text: x}}\n');
    expect(loadConfig(dir).auth?.url).toBe('https://a.test/login');
  });
});
