import { join } from 'node:path';
import { ShotdocError } from '../errors.js';
import { describeTarget, type Block, type Step, type WaitCondition } from '../parse/types.js';
import { takeScreenshot } from './capture.js';
import type { Session } from './session.js';
import { explain, locate } from './targets.js';

export interface Shot {
  name: string;
  alt?: string;
  /** Absolute path of the staged PNG. */
  path: string;
}

export interface RunContext {
  session: Session;
  file: string;
  stageDir: string;
}

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

function stepTarget(step: Step): string | undefined {
  switch (step.kind) {
    case 'goto':
      return resolveUrl(step.url, undefined);
    case 'click':
    case 'fill':
      return describeTarget(step.target);
    case 'wait':
      return describeWait(step.condition);
    case 'screenshot':
      return step.target ? describeTarget(step.target) : undefined;
  }
}

function resolveUrl(url: string, base: string | undefined): string {
  return base ? new URL(url, base).toString() : url;
}

async function exec(step: Step, ctx: RunContext, shots: Shot[]): Promise<void> {
  const { session } = ctx;
  switch (step.kind) {
    case 'goto': {
      const url = resolveUrl(step.url, session.config.baseUrl);
      const page = await session.openPage();
      let response;
      try {
        response = await page.goto(url);
      } catch (e) {
        throw explain(e, `${url} to load`).withLocation({ target: url });
      }
      if (response && response.status() >= 400) {
        throw new ShotdocError(`HTTP ${response.status()} ${response.statusText()}`.trim(), { target: url });
      }
      return;
    }
    case 'click': {
      const what = describeTarget(step.target);
      try {
        await locate(session.page, step.target).click();
      } catch (e) {
        throw explain(e, what);
      }
      return;
    }
    case 'fill': {
      const what = describeTarget(step.target);
      try {
        await locate(session.page, step.target).fill(step.value);
      } catch (e) {
        throw explain(e, what);
      }
      return;
    }
    case 'wait': {
      const c = step.condition;
      const page = session.page;
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
      return;
    }
    case 'screenshot': {
      const path = join(ctx.stageDir, `${step.name}.png`);
      await takeScreenshot(session, step, path);
      shots.push({ name: step.name, alt: step.alt, path });
      return;
    }
  }
}

/** Runs one block's steps in order; the first failure stops it with its location attached. */
export async function runBlock(block: Block, ctx: RunContext): Promise<Shot[]> {
  const shots: Shot[] = [];
  for (const step of block.steps) {
    try {
      await exec(step, ctx, shots);
    } catch (e) {
      const err = e instanceof ShotdocError ? e : explain(e, step.kind);
      throw err.withLocation({ file: ctx.file, blockLine: block.line, step: step.n, target: stepTarget(step) });
    }
  }
  return shots;
}
