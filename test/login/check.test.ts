import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { build } from '../../src/build.js';
import type { Auth } from '../../src/config.js';
import { LoginRequiredError } from '../../src/errors.js';
import { runLoginCheck } from '../../src/run/login.js';
import { Session } from '../../src/run/session.js';
import { type AuthServer, SESSION_VALUE, startAuthServer } from '../helpers/auth-server.js';
import { md, runMd, runThen, testConfig } from '../helpers/run.js';

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

const auth = (over: Partial<Auth['check']> = {}, state = join(dir, '.shotdoc/auth.json')): Auth => ({
  url: `${server.url}/login`,
  check: {
    url: `${server.url}/secure`,
    condition: { kind: 'visible', target: { kind: 'css', selector: 'h1:has-text("Secure Area")' } },
    ...over,
  },
  state,
  configName: 'shotdoc.config.yaml',
});

const LOGGED_IN = {
  cookies: [
    {
      name: 'sid',
      value: SESSION_VALUE,
      domain: '127.0.0.1',
      path: '/',
      expires: -1,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax' as const,
    },
  ],
  origins: [],
};
const saveState = (state: unknown, a: Auth) => {
  mkdirSync(join(a.state, '..'), { recursive: true });
  writeFileSync(a.state, typeof state === 'string' ? state : JSON.stringify(state));
};

async function check(a: Auth, state?: typeof LOGGED_IN) {
  const session = await Session.start(testConfig(server.url), state ? { storageState: state } : {});
  try {
    await runLoginCheck(session.context, a);
    return session.context.pages().length;
  } finally {
    await session.close();
  }
}

describe('the login check', () => {
  test('passes when logged in and leaves no page open', async () => {
    expect(await check(auth(), LOGGED_IN)).toBe(0);
  });

  test('fails when logged out, naming the page and the condition', async () => {
    await expect(check(auth())).rejects.toThrow(/not logged in: .*\/secure did not show .*Secure Area/);
  });

  test('passes on a page that answers 404 but renders the target', async () => {
    const a = auth({
      url: `${server.url}/inventory`,
      condition: { kind: 'text', text: 'Backpack' },
    });
    await check(a, LOGGED_IN);
  });

  test('fails on the 404 page when logged out', async () => {
    const a = auth({ url: `${server.url}/inventory`, condition: { kind: 'text', text: 'Backpack' } });
    await expect(check(a)).rejects.toThrow(/not logged in/);
  });

  test('uses check.url when the login page renders the same either way', async () => {
    const a = auth();
    // /login shows the form whether or not you are logged in, so it cannot prove a login...
    await expect(check({ ...a, check: { ...a.check, url: a.url } }, LOGGED_IN)).rejects.toThrow(/not logged in/);
    // ...but the check page can differ from the login page.
    await check(a, LOGGED_IN);
  });
});

describe('a build with a saved login', () => {
  const doc = md('- goto: /secure\n- screenshot: {name: s}');
  const config = (a: Auth) => ({ auth: a });
  const build = (a: Auth) => runMd(doc, server.url, config(a));

  test('shows the logged-in view', async () => {
    const a = auth();
    saveState(LOGGED_IN, a);
    const heading = await runThen(
      md('- goto: /secure'),
      server.url,
      (page) => page.locator('h1').innerText(),
      config(a),
    );
    expect(heading).toBe('Secure Area');
  });

  test('leaves the saved file byte for byte as it was', async () => {
    const a = auth();
    saveState(LOGGED_IN, a);
    const before = readFileSync(a.state);
    await build(a);
    expect(readFileSync(a.state).equals(before)).toBe(true);
  });

  test('with no saved file it fails and says to run shotdoc login', async () => {
    const a = auth();
    const err = await build(a).catch((e) => e);
    expect(err).toBeInstanceOf(LoginRequiredError);
    expect(err.message).toMatch(/no saved login at .*auth\.json\. Run `shotdoc login --config shotdoc\.config\.yaml`/);
  });

  test('with a file that is not JSON it fails', async () => {
    const a = auth();
    saveState('not json {', a);
    const err = await build(a).catch((e) => e);
    expect(err).toBeInstanceOf(LoginRequiredError);
    expect(err.message).toMatch(/could not be read/);
  });

  test('with a file that is JSON but not a usable session it fails as login required', async () => {
    const a = auth();
    saveState({ cookies: [{}], origins: [] }, a);
    const err = await build(a).catch((e) => e);
    expect(err).toBeInstanceOf(LoginRequiredError);
    expect(err.message).toMatch(/could not be restored/);
  });

  test('with an expired (empty) session it fails and names the check', async () => {
    const a = auth();
    saveState({ cookies: [], origins: [] }, a);
    const err = await build(a).catch((e) => e);
    expect(err).toBeInstanceOf(LoginRequiredError);
    expect(err.message).toMatch(/saved login is not valid: not logged in: .*Secure Area/);
    expect(err.message).toMatch(/shotdoc login/);
  });

  test('without auth the first block starts clean', async () => {
    const heading = await runThen(md('- goto: /secure'), server.url, (page) => page.locator('h1').innerText());
    expect(heading).toBe('Login Page');
  });
});

describe('a whole build with a saved login', () => {
  test('writes the logged-in screenshots and nothing from the session', async () => {
    writeFileSync(
      join(dir, 'shotdoc.config.yaml'),
      `baseUrl: ${server.url}\nauth:\n  url: /login\n  check: {url: /secure, visible: 'h1:has-text("Secure Area")'}\n`,
    );
    writeFileSync(join(dir, 'g.md'), md('- goto: /secure\n- screenshot: {name: secure}'));
    saveState(LOGGED_IN, auth(undefined, join(dir, '.shotdoc/auth.json')));
    const result = await build('g.md', dir);
    expect(result.images).toHaveLength(1);
    const files = (d: string): string[] =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? files(join(d, e.name)) : [join(d, e.name)],
      );
    for (const f of files(join(dir, 'build'))) {
      expect(readFileSync(f).includes(SESSION_VALUE)).toBe(false);
    }
  });
});
