import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Page } from 'playwright';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import type { Auth, Config } from '../../src/config.js';
import { gitIgnoreWarning, runLogin } from '../../src/run/login.js';
import { type AuthServer, SESSION_VALUE, startAuthServer } from '../helpers/auth-server.js';
import { testConfig } from '../helpers/run.js';

let server: AuthServer;
let dir: string;
beforeAll(async () => {
  server = await startAuthServer();
});
afterAll(() => server.close());
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'shotdoc-login-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const stateFile = () => join(dir, '.shotdoc', 'auth.json');
const config = (): Config & { auth: Auth } => ({
  ...testConfig(server.url),
  auth: {
    url: `${server.url}/login`,
    check: {
      url: `${server.url}/secure`,
      condition: { kind: 'visible', target: { kind: 'css', selector: 'h1:has-text("Secure Area")' } },
    },
    state: stateFile(),
    configName: 'shotdoc.config.yaml',
  },
});

/** What the author does by hand: fill the form and submit. */
const logIn = async (page: Page) => {
  await page.getByLabel('Username').fill('someone');
  await page.getByLabel('Password').fill('not-a-real-password');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/secure');
};

describe('shotdoc login', () => {
  test('saves the session after a passing check, readable only by the owner', async () => {
    const result = await runLogin(config(), { headless: true, ready: logIn });
    expect(result.state).toBe(stateFile());
    const saved = JSON.parse(readFileSync(stateFile(), 'utf8'));
    expect(saved.cookies.map((c: { name: string }) => c.name)).toEqual(['sid']);
    expect(statSync(stateFile()).mode & 0o777).toBe(0o600);
    expect(statSync(join(dir, '.shotdoc')).mode & 0o777).toBe(0o700);
    expect(readdirSync(join(dir, '.shotdoc'))).toEqual(['auth.json']);
  });

  test('nothing it returns contains a cookie value or the typed password', async () => {
    const result = await runLogin(config(), { headless: true, ready: logIn });
    const shown = JSON.stringify(result);
    expect(shown).not.toContain(SESSION_VALUE);
    expect(shown).not.toContain('not-a-real-password');
  });

  test('a new login replaces an earlier saved session', async () => {
    mkdirSync(join(dir, '.shotdoc'));
    writeFileSync(stateFile(), '{"cookies":[],"origins":[]}');
    await runLogin(config(), { headless: true, ready: logIn });
    expect(readFileSync(stateFile(), 'utf8')).toContain(SESSION_VALUE);
  });

  test('pressing Enter too early fails, saves nothing and keeps the earlier session', async () => {
    mkdirSync(join(dir, '.shotdoc'));
    const earlier = '{"cookies":[],"origins":[],"earlier":true}';
    writeFileSync(stateFile(), earlier);
    const err = await runLogin(config(), { headless: true, ready: async () => {} }).catch((e) => e);
    expect(err.message).toMatch(/not logged in: .*Secure Area.*; nothing was saved/);
    expect(err.message).not.toContain(SESSION_VALUE);
    expect(readFileSync(stateFile(), 'utf8')).toBe(earlier);
    expect(readdirSync(join(dir, '.shotdoc'))).toEqual(['auth.json']);
  });

  test('a failure before the login starts is the only failure reported', async () => {
    const unhandled: unknown[] = [];
    const note = (e: unknown) => unhandled.push(e);
    process.on('unhandledRejection', note);
    try {
      const c = config();
      c.auth.url = 'http://127.0.0.1:1/login';
      const err = await runLogin(c, { headless: true, ready: async () => {} }).catch((e) => e);
      expect(err.message).toMatch(/127\.0\.0\.1:1\/login/);
      await new Promise((r) => setTimeout(r, 200));
      expect(unhandled).toEqual([]);
    } finally {
      process.off('unhandledRejection', note);
    }
    expect(existsSync(stateFile())).toBe(false);
  });

  test('a browser closed early fails and saves nothing', async () => {
    const err = await runLogin(config(), {
      headless: true,
      ready: async (page) => {
        await page.context().browser()?.close();
        await new Promise(() => {});
      },
    }).catch((e) => e);
    expect(err.message).toMatch(/browser was closed.*nothing was saved/);
    expect(existsSync(stateFile())).toBe(false);
  });
});

describe('the git warning', () => {
  const file = () => join(dir, '.shotdoc', 'auth.json');
  const git = (...args: string[]) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });

  test('warns when the file is in a repository and not ignored', () => {
    git('init');
    mkdirSync(join(dir, '.shotdoc'));
    expect(gitIgnoreWarning(file())).toMatch(/holds session cookies and git does not ignore it/);
  });

  test('says nothing when it is ignored', () => {
    git('init');
    mkdirSync(join(dir, '.shotdoc'));
    writeFileSync(join(dir, '.gitignore'), '.shotdoc/\n');
    expect(gitIgnoreWarning(file())).toBeUndefined();
  });

  test('says nothing outside a repository', () => {
    mkdirSync(join(dir, '.shotdoc'));
    expect(gitIgnoreWarning(file())).toBeUndefined();
  });

  test('says nothing when the directory does not exist yet', () => {
    expect(gitIgnoreWarning(join(dir, 'nope', 'auth.json'))).toBeUndefined();
  });
});
