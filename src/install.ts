import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { ShotdocError } from './errors.js';

const require = createRequire(import.meta.url);

/**
 * The Playwright this copy of shotdoc loads: its version, and the installer it ships. Resolved from
 * shotdoc's own location, not the current directory, so it is the copy that will later launch the browser.
 */
export function playwrightInfo(): { version: string; installer: string } {
  const pkgPath = require.resolve('playwright/package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string; bin?: string | Record<string, string> };
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.playwright;
  if (!bin) {
    throw new ShotdocError(`could not find the installer that comes with Playwright ${pkg.version}`);
  }
  return { version: pkg.version, installer: join(dirname(pkgPath), bin) };
}

/** Browsers to install when none is named: what shotdoc drives. */
const DEFAULT_BROWSER = 'chromium';

/**
 * Runs Playwright's installer (`playwright install ...`) from the Playwright shotdoc itself uses, so the
 * browser installed is the one shotdoc will launch. Extra arguments go to the installer unchanged; Chromium is
 * installed unless a browser is named. Resolves to the installer's exit status.
 */
export function install(args: string[]): Promise<number> {
  const { installer } = playwrightInfo();
  const namesBrowser = args.some((a) => !a.startsWith('-'));
  const installerArgs = ['install', ...args, ...(namesBrowser ? [] : [DEFAULT_BROWSER])];
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [installer, ...installerArgs], { stdio: 'inherit' });
    child.on('error', (e) => reject(new ShotdocError(`could not run Playwright's installer: ${e.message}`)));
    child.on('close', (code) => resolve(code ?? 1));
  });
}
