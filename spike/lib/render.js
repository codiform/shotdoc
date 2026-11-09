// Stable rendering: fixed viewport/scale/locale/timezone, no animations, no caret.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export const DEFAULTS = {
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  locale: 'en-US',
  timezoneId: 'UTC',
  reducedMotion: 'reduce',
};

export const SHOT_OPTS = { animations: 'disabled', caret: 'hide' };

export function launch() {
  return chromium.launch();
}

export function newStableContext(browser, opts = {}) {
  return browser.newContext({ ...DEFAULTS, ...opts });
}

export async function shot(page, path, opts = {}) {
  mkdirSync(dirname(path), { recursive: true });
  return page.screenshot({ path, ...SHOT_OPTS, ...opts });
}
