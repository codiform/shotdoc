import type { Page } from 'playwright';
import { describeTarget, type WaitCondition } from '../parse/types.js';
import { explain, locate } from './targets.js';

export function describeWait(c: WaitCondition): string {
  switch (c.kind) {
    case 'visible':
      return `${describeTarget(c.target)} to become visible`;
    case 'hidden':
      return `${describeTarget(c.target)} to become hidden`;
    case 'text':
      return `the text "${c.text}" to appear`;
    case 'network':
      return 'the network to become idle';
    case 'ms':
      return `${c.ms} ms`;
  }
}

/** Waits until the condition holds, within the session's timeout; failures name the condition. */
export async function waitFor(page: Page, c: WaitCondition): Promise<void> {
  try {
    switch (c.kind) {
      case 'visible':
        await locate(page, c.target).waitFor({ state: 'visible' });
        break;
      case 'hidden':
        await locate(page, c.target).waitFor({ state: 'hidden' });
        break;
      case 'text':
        await page.waitForFunction((t) => document.body.innerText.includes(t), c.text);
        break;
      case 'network':
        await page.waitForLoadState('networkidle');
        break;
      case 'ms':
        await page.waitForTimeout(c.ms);
        break;
    }
  } catch (e) {
    throw explain(e, describeWait(c));
  }
}
