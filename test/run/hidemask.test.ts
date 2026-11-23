import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { md, runThen } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { pixel, shoot } from '../helpers/shot.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

// Scale 1, so a CSS pixel is an image pixel. Fixture colours (see test/fixtures/hidemask.html):
// page grey, banner yellow, #after blue, #a red, .date purple, #card white with a red #secret.
const GREY: [number, number, number] = [245, 245, 245];
const YELLOW: [number, number, number] = [255, 235, 59];
const BLUE: [number, number, number] = [0, 0, 200];
const RED: [number, number, number] = [200, 0, 0];
const PURPLE: [number, number, number] = [200, 0, 200];
const MASK: [number, number, number] = [85, 85, 85];
const WHITE: [number, number, number] = [255, 255, 255];

const page = (shot: string) => `- goto: /hidemask.html\n- screenshot: ${shot}`;
const run = (steps: string) => shoot(server.url, steps, { deviceScaleFactor: 1 });
const failure = async (steps: string): Promise<string> => {
  try {
    await run(steps);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected failure');
};

describe('hide', () => {
  test('a hidden element leaves a gap and the rest of the page stays where it was', async () => {
    const { plain, hidden } = await run(`${page('{name: plain}')}\n- screenshot: {name: hidden, hide: ["#banner"]}`);
    expect(pixel(plain!, 1000, 20)).toEqual(YELLOW);
    expect(pixel(hidden!, 1000, 20)).toEqual(GREY); // the banner, its background and its link are gone
    expect(pixel(hidden!, 600, 20)).toEqual(GREY);
    // Nothing below the banner moved: same size, and #after and #a are exactly where they were.
    expect([hidden!.width, hidden!.height]).toEqual([plain!.width, plain!.height]);
    expect(pixel(hidden!, 5, 50)).toEqual(BLUE);
    expect(pixel(hidden!, 60, 120)).toEqual(RED);
  });

  test('hiding a full-width banner changes only the banner band', async () => {
    const { plain, hidden } = await run(
      `${page('{name: plain}')}\n- screenshot: {name: hidden, hide: [{text: This is just a demo}]}`,
    );
    let changedBelow = 0;
    for (let y = 40; y < plain!.height; y++) {
      for (let x = 0; x < plain!.width; x++) {
        const a = pixel(plain!, x, y);
        const b = pixel(hidden!, x, y);
        // #late appears about 500 ms in, so it can differ between the two captures.
        if (x >= 260 && x < 320 && y >= 100 && y < 150) {
          continue;
        }
        if (a.join() !== b.join()) {
          changedBelow++;
        }
      }
    }
    expect(changedBelow).toBe(0);
  });

  test('an element screenshot keeps its usual size and shows the hidden element as background', async () => {
    const { card, hiddenCard } = await run(
      `${page('{name: card, target: "#card", padding: 0}')}\n- screenshot: {name: hiddenCard, target: "#card", padding: 0, hide: ["#secret"]}`,
    );
    expect([card!.width, card!.height]).toEqual([200, 100]);
    expect([hiddenCard!.width, hiddenCard!.height]).toEqual([200, 100]);
    expect(pixel(card!, 60, 40)).toEqual(RED);
    expect(pixel(hiddenCard!, 60, 40)).toEqual(WHITE);
  });

  test('a later screenshot without hide shows the element again', async () => {
    const { first, second } = await run(`${page('{name: first, hide: ["#banner"]}')}\n- screenshot: {name: second}`);
    expect(pixel(first!, 1000, 20)).toEqual(GREY);
    expect(pixel(second!, 1000, 20)).toEqual(YELLOW);
  });

  test('the previous inline visibility is put back', async () => {
    const styles = await runThen(md(`${page('{name: s, hide: ["#keep", "#banner"]}')}`), server.url, async (p) => ({
      keep: await p.locator('#keep').evaluate((e) => (e as HTMLElement).style.visibility),
      banner: await p.locator('#banner').evaluate((e) => (e as HTMLElement).style.cssText),
    }));
    expect(styles).toEqual({ keep: 'visible', banner: '' });
  });

  test('an element that appears shortly after the step starts is waited for and hidden', async () => {
    const { s } = await run(`${page('{name: s, hide: ["#late"]}')}`);
    expect(pixel(s!, 290, 120)).toEqual(GREY);
  });
});

describe('mask', () => {
  test('every match is covered with the default colour and other elements are untouched', async () => {
    const { s } = await run(page('{name: s, mask: [".date"]}'));
    // Every pixel of each date cell (100x30 at x=20, with text in it) is the mask colour: no text shows.
    for (const top of [200, 240, 280]) {
      for (let y = top; y < top + 30; y++) {
        for (let x = 20; x < 120; x++) {
          expect(pixel(s!, x, y)).toEqual(MASK);
        }
      }
    }
    expect(pixel(s!, 60, 120)).toEqual(RED);
    expect([s!.width, s!.height]).toEqual([1280, 800]);
  });

  test('an element screenshot is masked and keeps its size', async () => {
    const { s } = await run(page('{name: s, target: "#card", padding: 0, mask: ["#secret"]}'));
    expect([s!.width, s!.height]).toEqual([200, 100]);
    expect(pixel(s!, 60, 40)).toEqual(MASK);
    expect(pixel(s!, 150, 80)).toEqual(WHITE);
  });

  test('maskColor overrides the colour', async () => {
    const { s } = await run(page('{name: s, mask: ["#a"], maskColor: "#ff00ff"}'));
    expect(pixel(s!, 60, 120)).toEqual([255, 0, 255]);
  });

  test('a region larger than the viewport is masked below the first screen', async () => {
    const { s } = await run(page('{name: s, target: "#tall", padding: 0, mask: ["#far"]}'));
    expect(s!.height).toBe(1600);
    expect(pixel(s!, 100, 1320)).toEqual(MASK);
    expect(pixel(s!, 250, 100)).toEqual(WHITE);
  });

  test('a later screenshot without mask shows the element normally', async () => {
    const { first, second } = await run(`${page('{name: first, mask: [".date"]}')}\n- screenshot: {name: second}`);
    expect(pixel(first!, 70, 215)).toEqual(MASK);
    expect(pixel(second!, 70, 215)).toEqual(PURPLE);
  });

  test('masks and hides can be used together', async () => {
    const { s } = await run(page('{name: s, hide: ["#banner"], mask: ["#a"]}'));
    expect(pixel(s!, 1000, 20)).toEqual(GREY);
    expect(pixel(s!, 60, 120)).toEqual(MASK);
  });

  test('a colour the browser does not understand fails, naming it', async () => {
    const m = await failure(page('{name: s, mask: ["#a"], maskColor: "not-a-colour"}'));
    expect(m).toMatch(/doc\.md:1 \(step 2\): maskColor "not-a-colour" is not a colour the browser understands/);
  });
});

describe('targets that match nothing', () => {
  test('a mask or hide target that never matches fails after the timeout, naming it and the option', async () => {
    const [mask, hide] = await Promise.all([
      failure(page('{name: s, mask: [".nope"]}')),
      failure(page('{name: s, hide: [{text: Nowhere}]}')),
    ]);
    expect(mask).toMatch(/doc\.md:1 \(step 2\): mask target css=\.nope: timed out after 10s/);
    expect(hide).toMatch(/doc\.md:1 \(step 2\): hide target text="Nowhere": timed out after 10s/);
    expect(mask).not.toMatch(/exactly one/);
    expect(hide).not.toMatch(/exactly one/);
  });
});

describe('blank captures under a mask', () => {
  test('the message mentions the mask when one is present', async () => {
    const m = await failure(
      '- goto: /swatch.html\n- screenshot: {name: s, target: "#swatch", padding: 0, mask: ["#swatch"]}',
    );
    expect(m).toMatch(/screenshot "s" is blank: every pixel is the same colour \(#555555\)/);
    expect(m).toMatch(/A mask may be covering everything in the image/);
  });

  test('the message is unchanged without a mask', async () => {
    const m = await failure('- goto: /swatch.html\n- screenshot: {name: s, target: "#swatch", padding: 0}');
    expect(m).not.toMatch(/mask/i);
    expect(m).toMatch(/add a wait step for something that appears when it is ready$/);
  });
});
