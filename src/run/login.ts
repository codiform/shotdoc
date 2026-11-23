import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { BrowserContext, Page } from 'playwright';
import type { Auth, Config } from '../config.js';
import { LoginRequiredError, ShotdocError } from '../errors.js';
import { describeTarget } from '../parse/types.js';
import { Session } from './session.js';
import { explain } from './targets.js';
import { describeWait, waitFor } from './wait.js';

/** What the check looks for, in words. */
export function describeCheck(auth: Auth): string {
  const c = auth.check.condition;
  return c.kind === 'visible' ? `${describeTarget(c.target)} to be visible` : `the text "${c.text}"`;
}

/**
 * Runs the login check in `context`: loads the check page in a throwaway page and waits for the
 * condition. The page's HTTP status does not count, only the condition does. Throws a
 * ShotdocError saying what was not found; the page is always closed.
 */
export async function runLoginCheck(context: BrowserContext, auth: Auth): Promise<void> {
  const page = await context.newPage();
  try {
    try {
      await page.goto(auth.check.url);
    } catch (e) {
      throw explain(e, `${auth.check.url} to load`);
    }
    try {
      await waitFor(page, auth.check.condition);
    } catch (e) {
      const reason = e instanceof ShotdocError ? e.reason : String(e);
      throw new ShotdocError(
        `not logged in: ${auth.check.url} did not show ${describeCheck(auth)} (${reason.replace(describeWait(auth.check.condition), 'the check')})`,
      );
    }
  } finally {
    await page.close().catch(() => {});
  }
}

/**
 * Reads the saved session for a build. A file that is missing, unreadable or not a saved session
 * means the author has to log in again.
 */
export function readSavedSession(auth: Auth): { cookies: unknown[]; origins: unknown[] } {
  const again = `Run \`shotdoc login --config ${auth.configName}\` to log in.`;
  let text: string;
  try {
    text = readFileSync(auth.state, 'utf8');
  } catch {
    throw new LoginRequiredError(`there is no saved login at ${auth.state}. ${again}`, { file: auth.configName });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  const state = parsed as { cookies?: unknown; origins?: unknown } | undefined;
  if (!state || !Array.isArray(state.cookies) || !Array.isArray(state.origins)) {
    throw new LoginRequiredError(`the saved login at ${auth.state} could not be read. ${again}`, {
      file: auth.configName,
    });
  }
  return { cookies: state.cookies, origins: state.origins };
}

/** Starts a build's session from the saved login and proves it still works, before any block runs. */
export async function startLoggedIn(config: Config & { auth: Auth }): Promise<Session> {
  const auth = config.auth;
  const state = readSavedSession(auth);
  let session: Session;
  try {
    session = await Session.start(config, { storageState: state as never });
  } catch (e) {
    if (e instanceof ShotdocError) {
      throw e;
    }
    // Playwright refused the file's contents: it is not a usable saved session.
    throw new LoginRequiredError(
      `the saved login at ${auth.state} could not be restored. Run \`shotdoc login --config ${auth.configName}\` to log in.`,
      { file: auth.configName },
    );
  }
  try {
    await runLoginCheck(session.context, auth);
  } catch (e) {
    await session.close();
    if (e instanceof ShotdocError) {
      throw new LoginRequiredError(
        `the saved login is not valid: ${e.reason}. Run \`shotdoc login --config ${auth.configName}\` to log in again.`,
        { file: auth.configName },
      );
    }
    throw e;
  }
  return session;
}

/**
 * A warning when the saved session sits in a git repository that does not ignore it; nothing when
 * it is ignored, when there is no repository, or when git is not installed.
 */
export function gitIgnoreWarning(file: string): string | undefined {
  const r = spawnSync('git', ['check-ignore', '-q', '--', basename(file)], { cwd: dirname(file), stdio: 'ignore' });
  if (r.error || r.status !== 1) {
    return undefined;
  }
  return `${file} holds session cookies and git does not ignore it: add it to .gitignore so it is never committed`;
}

/** Writes the file through a temporary file and a rename, readable only by its owner. */
function writePrivately(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  try {
    writeFileSync(tmp, content, { mode: 0o600 });
    chmodSync(tmp, 0o600);
    renameSync(tmp, path);
  } finally {
    rmSync(tmp, { force: true });
  }
}

/**
 * Logs in by hand and saves the session. Opens a browser at `auth.url` and calls `ready` with its
 * page; when `ready` returns the author is taken to be logged in. Then the check runs and, only if
 * it passes, the session is saved. Nothing about the credentials passes through here: only the
 * session the browser holds afterwards is stored. `headless` is for tests.
 */
export async function runLogin(
  config: Config & { auth: Auth },
  opts: { headless: boolean; ready: (page: Page) => Promise<void> },
): Promise<{ state: string; warning?: string }> {
  const { auth } = config;
  const session = await Session.start(config, { headless: opts.headless });
  try {
    const closed = new Promise<never>((_, reject) => {
      session.browser.on('disconnected', () =>
        reject(new ShotdocError('the browser was closed before the login finished: nothing was saved')),
      );
    });
    closed.catch(() => {}); // handled by the races below; an earlier failure must not leave it unhandled
    const page = await session.openPage();
    try {
      await page.goto(auth.url);
    } catch (e) {
      throw explain(e, `${auth.url} to load`);
    }
    const done = opts.ready(page);
    done.catch(() => {});
    await Promise.race([done, closed]);
    try {
      await Promise.race([runLoginCheck(session.context, auth), closed]);
    } catch (e) {
      if (e instanceof ShotdocError) {
        throw new ShotdocError(`${e.reason}; nothing was saved`);
      }
      throw e;
    }
    const state = await session.context.storageState({ indexedDB: true });
    writePrivately(auth.state, JSON.stringify(state));
    const warning = gitIgnoreWarning(auth.state);
    return warning === undefined ? { state: auth.state } : { state: auth.state, warning };
  } finally {
    await session.close().catch(() => {});
  }
}
