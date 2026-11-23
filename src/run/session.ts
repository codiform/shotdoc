import { type Browser, type BrowserContext, chromium, type Page } from 'playwright';
import type { Config } from '../config.js';
import { ShotdocError } from '../errors.js';

/** Fixed timeout for every waiting action, in milliseconds. */
export const TIMEOUT_MS = 10_000;

type StorageState = NonNullable<Parameters<Browser['newContext']>[0]>['storageState'];

/** One headless browser session: a fresh context, and one page once the first `goto` has run. */
export class Session {
  private pageRef?: Page;

  private constructor(
    readonly browser: Browser,
    readonly context: BrowserContext,
    readonly config: Config,
  ) {
    context.setDefaultTimeout(TIMEOUT_MS);
    context.setDefaultNavigationTimeout(TIMEOUT_MS);
  }

  /**
   * Starts a browser with a fresh context: clean, or from a saved session. `headless: false` is for
   * `shotdoc login` only; builds are always headless.
   */
  static async start(config: Config, opts: { storageState?: StorageState; headless?: boolean } = {}): Promise<Session> {
    let browser: Browser;
    try {
      browser = await chromium.launch({ headless: opts.headless ?? true });
    } catch (e) {
      const msg = (e as Error).message;
      if (/Executable doesn't exist/i.test(msg)) {
        throw new ShotdocError(
          'the Chromium browser used by shotdoc is not installed. Install it with: npx playwright install chromium',
        );
      }
      throw new ShotdocError(`could not launch the browser: ${msg.split('\n')[0]}`);
    }
    const context = await browser.newContext({
      viewport: config.viewport,
      deviceScaleFactor: config.deviceScaleFactor,
      locale: 'en-US',
      timezoneId: 'UTC',
      ...(opts.storageState === undefined ? {} : { storageState: opts.storageState }),
    });
    return new Session(browser, context, config);
  }

  /** The open page; fails clearly when no `goto` has run yet. */
  get page(): Page {
    if (!this.pageRef) {
      throw new ShotdocError('no page is open yet: begin the first block with a `goto` step');
    }
    return this.pageRef;
  }

  get hasPage(): boolean {
    return this.pageRef !== undefined;
  }

  async openPage(): Promise<Page> {
    this.pageRef ??= await this.context.newPage();
    return this.pageRef;
  }

  async close(): Promise<void> {
    await this.browser.close();
  }
}
