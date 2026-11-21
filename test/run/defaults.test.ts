import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { md, runThen } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { type Image, pixel, shootDocument } from '../helpers/shot.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

// Scale 1, so a CSS pixel is an image pixel. Colours are those of test/fixtures/hidemask.html.
const GREY: [number, number, number] = [245, 245, 245];
const YELLOW: [number, number, number] = [255, 235, 59];
const RED: [number, number, number] = [200, 0, 0];
const MASK: [number, number, number] = [85, 85, 85];
const AT_BANNER: [number, number] = [1000, 20];
const AT_A: [number, number] = [60, 120];

/** A document whose front matter declares these defaults (YAML under `shotdoc.defaults`). */
const doc = (defaults: string, ...blocks: string[]) =>
  `---\ntitle: Guide\nshotdoc:\n  defaults:\n${defaults
    .split('\n')
    .map((l) => `    ${l}`)
    .join('\n')}\n---\n\n${md(...blocks)}`;
const page = (shot: string) => `- goto: /hidemask.html\n- screenshot: ${shot}`;
const run = (defaults: string, ...blocks: string[]) =>
  shootDocument(server.url, doc(defaults, ...blocks), { deviceScaleFactor: 1 });
const failure = async (defaults: string, ...blocks: string[]): Promise<string> => {
  try {
    await run(defaults, ...blocks);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected failure');
};
const px = (img: Image | undefined, [x, y]: [number, number]) => pixel(img!, x, y);

describe('default hide', () => {
  test('applies to every screenshot, in every block, and the page is restored afterwards', async () => {
    const source = doc(
      'hide: ["#banner"]',
      page('{name: one}'),
      '- screenshot: {name: two}',
      '- screenshot: {name: three, defaults: false}',
    );
    const { one, two, three } = await shootDocument(server.url, source, { deviceScaleFactor: 1 });
    expect(px(one, AT_BANNER)).toEqual(GREY);
    expect(px(two, AT_BANNER)).toEqual(GREY);
    expect(px(three, AT_BANNER)).toEqual(YELLOW);
    expect(px(one, AT_A)).toEqual(RED);

    const visibility = await runThen(source, server.url, (p) =>
      p.evaluate(() => document.querySelector<HTMLElement>('#banner')?.style.visibility),
    );
    expect(visibility).toBe('');
  });

  test('a shot hides its own elements as well, and only the defaults reach the next shot', async () => {
    const { s, next } = await run(
      'hide: ["#banner"]',
      `${page('{name: s, hide: ["#a"]}')}\n- screenshot: {name: next}`,
    );
    expect(px(s, AT_BANNER)).toEqual(GREY);
    expect(px(s, AT_A)).toEqual(GREY);
    expect(px(next, AT_BANNER)).toEqual(GREY);
    expect(px(next, AT_A)).toEqual(RED);
  });

  test('an element in both the defaults and a shot’s own hide is shown again afterwards', async () => {
    // #keep has its own inline `visibility: visible`, so the value put back must be that one.
    const source = doc('hide: ["#banner", "#keep"]', `${page('{name: s, hide: ["#banner", "#keep", "#keep"]}')}`);
    const styles = await runThen(source, server.url, (p) =>
      p.evaluate(() => ({
        banner: document.querySelector<HTMLElement>('#banner')?.style.visibility,
        keep: document.querySelector<HTMLElement>('#keep')?.style.visibility,
      })),
    );
    expect(styles).toEqual({ banner: '', keep: 'visible' });

    const { s, next } = await run(
      'hide: ["#banner"]',
      `${page('{name: s, hide: ["#banner"]}')}\n- screenshot: {name: next, defaults: false}`,
    );
    expect(px(s, AT_BANNER)).toEqual(GREY);
    expect(px(next, AT_BANNER)).toEqual(YELLOW);
  });

  test('text targets work as defaults', async () => {
    const { s } = await run('hide: [{text: This is just a demo}]', page('{name: s}'));
    expect(px(s, AT_BANNER)).toEqual(GREY);
  });
});

describe('default mask', () => {
  test('masks every screenshot in the default grey', async () => {
    const { s } = await run('mask: ["#a"]', page('{name: s}'));
    expect(px(s, AT_A)).toEqual(MASK);
  });

  test('the default colour applies unless the shot gives its own', async () => {
    const { plain, own } = await run(
      'mask: ["#a"]\nmaskColor: "#333333"',
      `${page('{name: plain}')}\n- screenshot: {name: own, maskColor: "#ff00ff"}`,
    );
    expect(px(plain, AT_A)).toEqual([51, 51, 51]);
    expect(px(own, AT_A)).toEqual([255, 0, 255]);
  });

  test('a shot adds its own mask to the default one', async () => {
    const { s } = await run('mask: ["#a"]', page('{name: s, mask: ["#b"]}'));
    expect(px(s, AT_A)).toEqual(MASK);
    expect(px(s, [180, 120])).toEqual(MASK);
  });

  test('an invalid default colour fails the screenshot naming the colour', async () => {
    const m = await failure('mask: ["#a"]\nmaskColor: not-a-colour', page('{name: s}'));
    expect(m).toMatch(/doc\.md:\d+ \(step 2\): maskColor "not-a-colour" is not a colour the browser understands/);
  });
});

describe('opting out', () => {
  test('`defaults: false` removes hide, mask and the colour', async () => {
    const { s } = await run('hide: ["#banner"]\nmask: ["#a"]', page('{name: s, defaults: false}'));
    expect(px(s, AT_BANNER)).toEqual(YELLOW);
    expect(px(s, AT_A)).toEqual(RED);
  });

  test('an opted-out shot still has its own hide and mask', async () => {
    const { s } = await run('hide: ["#banner"]', page('{name: s, defaults: false, mask: ["#a"]}'));
    expect(px(s, AT_BANNER)).toEqual(YELLOW);
    expect(px(s, AT_A)).toEqual(MASK);
  });
});

describe('default targets need not match', () => {
  test('a default that matches nothing neither fails nor waits for the timeout', async () => {
    const started = Date.now();
    const { s } = await run('hide: [{text: Nowhere}]\nmask: [".nope"]', page('{name: s}'));
    expect(Date.now() - started).toBeLessThan(8000); // a missing own target waits 10 s, then fails
    expect(px(s, AT_BANNER)).toEqual(YELLOW);
    expect(px(s, AT_A)).toEqual(RED);
  });

  test('a default mask outside the captured region leaves the image as it was', async () => {
    const { plain, masked } = await run(
      'mask: ["#far"]',
      `- goto: /hidemask.html\n- screenshot: {name: plain, target: "#card", padding: 0, defaults: false}\n- screenshot: {name: masked, target: "#card", padding: 0}`,
    );
    expect(masked!.data.equals(plain!.data)).toBe(true);
  });

  test('a default for something on some pages only works in one document', async () => {
    const { on, off } = await run(
      'hide: ["#banner"]',
      `${page('{name: on}')}\n- goto: /index.html\n- screenshot: {name: off}`,
    );
    expect(px(on, AT_BANNER)).toEqual(GREY);
    expect(off!.width).toBeGreaterThan(0);
  });

  test('a default mask on an element that is not displayed does not fail', async () => {
    const { s } = await run('mask: ["#gone"]\nhide: ["#gone"]', page('{name: s}'));
    expect(px(s, AT_A)).toEqual(RED);
  });

  test('a shot’s own target that matches nothing still fails when defaults exist', async () => {
    const m = await failure('hide: ["#banner"]', page('{name: s, mask: [".nope"]}'));
    expect(m).toMatch(/doc\.md:\d+ \(step 2\): mask target css=\.nope: timed out after 10s/);
  });
});

describe('blank captures under a default mask', () => {
  test('the message mentions the mask', async () => {
    const m = await failure(
      'mask: ["#swatch"]',
      '- goto: /swatch.html\n- screenshot: {name: s, target: "#swatch", padding: 0}',
    );
    expect(m).toMatch(/screenshot "s" is blank: every pixel is the same colour \(#555555\)/);
    expect(m).toMatch(/A mask may be covering everything in the image/);
  });
});
