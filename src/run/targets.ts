import { errors as pwErrors, type Locator, type Page } from 'playwright';
import { ShotdocError } from '../errors.js';
import { describeTarget, type Target } from '../parse/types.js';
import { TIMEOUT_MS } from './session.js';

export function locate(page: Page, t: Target): Locator {
  switch (t.kind) {
    case 'css':
      return page.locator(t.selector);
    case 'role':
      return page.getByRole(t.role as Parameters<Page['getByRole']>[0], t.name !== undefined ? { name: t.name } : {});
    case 'text':
      return page.getByText(t.text);
    case 'label':
      return page.getByLabel(t.label);
  }
}

/** Turns a Playwright failure into a short reason an author can act on. */
export function explain(e: unknown, what: string): ShotdocError {
  if (e instanceof ShotdocError) return e;
  const msg = e instanceof Error ? e.message : String(e);
  const strict = /resolved to (\d+) elements/.exec(msg);
  if (strict) {
    return new ShotdocError(`${what} matched ${strict[1]} elements but must match exactly one; make the target more specific`);
  }
  if (e instanceof pwErrors.TimeoutError || /Timeout \d+ms exceeded/.test(msg)) {
    return new ShotdocError(`timed out after ${TIMEOUT_MS / 1000}s waiting for ${what}`);
  }
  return new ShotdocError(msg.split('\n')[0] ?? msg);
}

export { describeTarget };
