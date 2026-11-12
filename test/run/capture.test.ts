import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { parseDocument } from '../../src/parse/document.js';
import type { Step } from '../../src/parse/types.js';
import { takeScreenshot } from '../../src/run/capture.js';
import { runDocument } from '../../src/run/run.js';
import { Session } from '../../src/run/session.js';
import { md, testConfig } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { pixel, shoot, solidWithBorder } from '../helpers/shot.js';

const cssShot = (name: string, selector: string, padding: number): Extract<Step, { kind: 'screenshot' }> => ({
  n: 1,
  kind: 'screenshot',
  name,
  target: { kind: 'css', selector },
  include: [],
  padding,
});

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

const go = (page: string, shot: string) => `- goto: /${page}\n- screenshot: ${shot}`;
const failure = async (steps: string): Promise<string> => {
  try {
    await shoot(server.url, steps);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected failure');
};

describe('viewport captures and stable rendering', () => {
  test('default 1280x800 at scale 2 gives 2560x1600', async () => {
    const { a } = await shoot(server.url, go('index.html', '{name: a}'));
    expect([a!.width, a!.height]).toEqual([2560, 1600]);
  });

  test('dimensions follow configured viewport and scale', async () => {
    const { a } = await shoot(server.url, go('index.html', '{name: a}'), {
      viewport: { width: 640, height: 480 },
      deviceScaleFactor: 1.5,
    });
    expect([a!.width, a!.height]).toEqual([960, 720]);
  });

  test('padding is ignored for a viewport capture', async () => {
    const { a } = await shoot(server.url, go('index.html', '{name: a, padding: 50}'));
    expect(a!.width).toBe(2560);
  });

  test('no caret pixels for a focused field', async () => {
    const session = await Session.start(testConfig(server.url));
    try {
      const page = await session.openPage();
      await page.goto(`${server.url}/caret.html`);
      await page.focus('#field');
      const step = cssShot('c', '#field', 4);
      const shots: Buffer[] = [];
      for (let i = 0; i < 3; i++) {
        const p = `${process.env.TMPDIR ?? '/tmp'}/shotdoc-caret-${i}.png`;
        await takeScreenshot(session, step, p);
        shots.push((await import('node:fs')).readFileSync(p));
        await new Promise((r) => setTimeout(r, 330)); // cross blink phases
      }
      await page.addStyleTag({ content: 'input{caret-color:transparent}' });
      const refPath = `${process.env.TMPDIR ?? '/tmp'}/shotdoc-caret-ref.png`;
      await takeScreenshot(session, step, refPath);
      const reference = PNG.sync.read((await import('node:fs')).readFileSync(refPath));
      for (const s of shots) expect(PNG.sync.read(s).data.equals(reference.data)).toBe(true);
    } finally {
      await session.close();
    }
  });
});

describe('readiness', () => {
  test('waits for a sliding element to stop and shows it in its final position', async () => {
    const { s } = await shoot(server.url, go('slide.html', '{name: s, target: "#card", padding: 0}'));
    expect([s!.width, s!.height]).toEqual([400, 200]);
    expect(solidWithBorder(s!, [255, 0, 0])).toBe(true);
  });

  test('a target that stays hidden fails naming it', async () => {
    const m = await failure(go('slide.html', '{name: s, target: "#ghost"}'));
    expect(m).toMatch(/doc\.md:1 \(step 2, css=#ghost\): timed out after 10s waiting for css=#ghost/);
  });
});

describe('element captures', () => {
  test('image size is the whole-pixel region times the scale, even for a fractional element', async () => {
    const { f } = await shoot(server.url, go('fractional.html', '{name: f, target: "#frac"}'));
    const w = f!.width / 2;
    const h = f!.height / 2;
    expect(Number.isInteger(w) && Number.isInteger(h)).toBe(true);
    expect(w).toBeGreaterThanOrEqual(114.39);
    expect(w).toBeLessThanOrEqual(116);
    expect(h).toBe(62);
  });

  test('element at the page corner with padding 20 succeeds', async () => {
    const { c } = await shoot(server.url, go('corner.html', '{name: c, target: "#corner", padding: 20}'));
    expect([c!.width, c!.height]).toEqual([240, 140]);
    expect(pixel(c!, 0, 0)).toEqual([0, 128, 0]);
  });

  test('default padding is 16 css pixels', async () => {
    const { m } = await shoot(server.url, go('menu.html', '{name: m, target: "#menu"}'));
    expect([m!.width, m!.height]).toEqual([(200 + 32) * 2, (150 + 32) * 2]);
  });

  test('header plus open menu are both in the image', async () => {
    const { m } = await shoot(
      server.url,
      go('menu.html', '{name: m, target: "#header", include: ["#menu"], padding: 0}'),
    );
    expect([m!.width, m!.height]).toEqual([800, 420]);
    expect(pixel(m!, 10, 10)).toEqual([30, 30, 30]); // header
    expect(pixel(m!, 10, 2 * (100 - 20))).toEqual([250, 200, 0]); // inside the menu
  });

  test('a missing included target fails naming it', async () => {
    const m = await failure(go('menu.html', '{name: m, target: "#header", include: ["#nope"]}'));
    expect(m).toMatch(/included target css=#nope/);
  });
});

describe('session state across blocks', () => {
  test('a screenshot in a later block shows state an earlier block created', async () => {
    // #out is an empty (zero-height, never visible) paragraph until Save is clicked in block one.
    const { o } = await shoot(
      server.url,
      '- goto: /form.html\n- click: "#save"\n```\n\ntext\n\n```shotdoc\n- screenshot: {name: o, target: "#out", padding: 0}',
    );
    expect(o!.width).toBeGreaterThan(0);
  });
});

describe('viewport-first capture', () => {
  test('element below the fold is scrolled into view', async () => {
    const { d } = await shoot(server.url, go('fold.html', '{name: d, target: "#deep", padding: 0}'));
    expect([d!.width, d!.height]).toEqual([400, 200]);
    expect(solidWithBorder(d!, [0, 0, 255])).toBe(true);
  });

  test('a region that needs scrolling to fit is captured whole', async () => {
    const { s } = await shoot(server.url, go('fold.html', '{name: s, target: "#straddle", padding: 0}'));
    expect([s!.width, s!.height]).toEqual([400, 300]);
    expect(solidWithBorder(s!, [0, 0, 255])).toBe(true);
  });

  test('a page that redraws on resize is not blanked and the viewport is untouched', async () => {
    const session = await Session.start(testConfig(server.url));
    try {
      const page = await session.openPage();
      await page.goto(`${server.url}/resize.html`);
      const step = cssShot('r', '#card', 0);
      const p = `${process.env.TMPDIR ?? '/tmp'}/shotdoc-resize.png`;
      await takeScreenshot(session, step, p);
      const img = PNG.sync.read((await import('node:fs')).readFileSync(p));
      expect(solidWithBorder(img, [0, 160, 0])).toBe(true);
      expect(await page.evaluate(() => (window as unknown as { resized: number }).resized)).toBe(0);
      expect(page.viewportSize()).toEqual({ width: 1280, height: 800 });
    } finally {
      await session.close();
    }
  });

  test('an oversized region still produces an image', async () => {
    const { h } = await shoot(server.url, go('huge.html', '{name: h, target: "#huge", padding: 0}'));
    expect([h!.width, h!.height]).toEqual([4000, 3000]);
    expect(solidWithBorder(h!, [200, 0, 200])).toBe(true);
  });
});

describe('blank captures', () => {
  test('a viewport screenshot of an empty page fails, naming the screenshot and the colour', async () => {
    const m = await failure(go('blank.html', '{name: b}'));
    expect(m).toMatch(/doc\.md:1 \(step 2\): screenshot "b" is blank: every pixel is the same colour \(#ffffff\)/);
    expect(m).toMatch(/add a wait step/);
  });

  test('a solid element with padding 0 fails and names the target', async () => {
    const m = await failure(go('swatch.html', '{name: s, target: "#swatch", padding: 0}'));
    expect(m).toMatch(/doc\.md:1 \(step 2, css=#swatch\): screenshot "s" is blank: .*\(#ff0000\)/);
  });

  test('the same element with the default padding succeeds, because the page around it differs', async () => {
    const { s } = await shoot(server.url, go('swatch.html', '{name: s, target: "#swatch"}'));
    expect([s!.width, s!.height]).toEqual([(100 + 32) * 2, (50 + 32) * 2]);
    expect(pixel(s!, 0, 0)).toEqual([255, 255, 255]);
    expect(pixel(s!, 40, 40)).toEqual([255, 0, 0]);
  });

  test('a page with content is not rejected', async () => {
    const { a } = await shoot(server.url, go('index.html', '{name: a}'));
    expect(a).toBeDefined();
  });

  test('no image is left in the stage directory after a blank screenshot fails', async () => {
    const config = testConfig(server.url);
    const blocks = parseDocument(md(go('blank.html', '{name: b}')), 'doc.md', { baseUrl: config.baseUrl });
    const stageDir = mkdtempSync(join(tmpdir(), 'shotdoc-blank-'));
    try {
      await expect(runDocument(blocks, { config, file: 'doc.md', stageDir })).rejects.toThrow(/is blank/);
      expect(readdirSync(stageDir)).toEqual([]);
    } finally {
      rmSync(stageDir, { recursive: true, force: true });
    }
  });
});
