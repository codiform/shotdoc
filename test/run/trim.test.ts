import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { type Image, pixel, shoot } from '../helpers/shot.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

// Scale 1, so a CSS pixel is an image pixel. See test/fixtures/trim.html: #panel is 600x200 at 40,40,
// made of 100x50 cells; #popup is 150x50 at 200,100; #wide is 2000px wide.
const cell = (col: number, row: number): [number, number, number] => [col * 10, row * 60, 100];
const POPUP: [number, number, number] = [250, 200, 0];
const size = (img: Image) => [img.width, img.height];

const run = async (options: string, target = '#panel', padding = 0) => {
  const shot = `{name: a, target: "${target}", padding: ${padding}, ${options}}`;
  const out = await shoot(server.url, `- goto: /trim.html\n- screenshot: ${shot}`, { deviceScaleFactor: 1 });
  return out.a!;
};
const failure = async (options: string, target?: string, padding?: number): Promise<string> => {
  try {
    await run(options, target, padding);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected failure');
};

describe('trimming the target', () => {
  test('pixels from one side keep the rest at full height', async () => {
    const img = await run('trim: {right: 400}');
    expect(size(img)).toEqual([200, 200]);
    expect(pixel(img, 0, 0)).toEqual(cell(0, 0));
    expect(pixel(img, 199, 199)).toEqual(cell(1, 3));
  });

  test('a percentage is of the width', async () => {
    expect(size(await run('trim: {right: 60%}'))).toEqual([240, 200]);
  });

  test('several sides and mixed units', async () => {
    const img = await run('trim: {left: 100, right: 50%, top: 25%}');
    expect(size(img)).toEqual([200, 150]);
    expect(pixel(img, 0, 0)).toEqual(cell(1, 1));
    expect(pixel(img, 199, 149)).toEqual(cell(2, 3));
  });

  test('a target wider than the viewport is captured without resizing it when the rest fits', async () => {
    const img = await run('trim: {left: 1500}', '#wide');
    expect(size(img)).toEqual([500, 100]);
    expect(pixel(img, 0, 0)).toEqual([150, 0, 200]);
    expect(pixel(img, 499, 99)).toEqual([190, 60, 200]);
  });

  test('a remainder larger than the viewport is trimmed too', async () => {
    const img = await run('trim: {left: 200}', '#wide');
    expect(size(img)).toEqual([1800, 100]);
    expect(pixel(img, 0, 0)[0]).toBe(20);
  });
});

describe('included elements and annotations are never cut', () => {
  test('an included popup reaching past the cut stays whole', async () => {
    const img = await run('trim: {right: 400}, include: ["#popup"]');
    // From the panel's left edge (40) to the popup's right edge (350).
    expect(size(img)).toEqual([310, 200]);
    expect(pixel(img, 309, 80)).toEqual(POPUP);
  });

  test('an annotation in the trimmed area makes the image grow to contain it', async () => {
    const img = await run('trim: {right: 400}, annotate: [{highlight: "#panel-5-1"}]');
    // The cell ends at 640 and its highlight reaches 7px further; the image starts at 40.
    expect(img.width).toBe(607);
  });

  test('padding is added past the cut', async () => {
    const img = await run('trim: {right: 400}', '#panel', 16);
    expect(size(img)).toEqual([232, 232]);
    expect(pixel(img, 231, 16)).toEqual(cell(2, 0));
  });
});

describe('a trim that leaves nothing fails', () => {
  test('wider than the target', async () => {
    const message = await failure('trim: {right: 700}');
    expect(message).toMatch(
      /screenshot "a": trim leaves nothing of the target css=#panel, which is 600x200 CSS pixels/,
    );
  });

  test.each(['trim: {top: 60%, bottom: 50%}', 'trim: {left: 30%, right: 70%}', 'trim: {top: 200}'])(
    '%s',
    async (options) => {
      expect(await failure(options)).toMatch(/trim leaves nothing of the target/);
    },
  );

  test('even when an included element would give the image some area', async () => {
    expect(await failure('trim: {right: 700}, include: ["#popup"]')).toMatch(/trim leaves nothing/);
  });
});

// #drawer is 400x100 at -300,520, so only its rightmost 100px are on the page.
describe('a trim that leaves only what is off the page fails', () => {
  test.each([0, 16])('with padding %i', async (padding) => {
    expect(await failure('trim: {right: 305}', '#drawer', padding)).toMatch(
      /screenshot "a": trim leaves none of the target css=#drawer on the page/,
    );
  });

  test('padding does not rescue a remainder that ends just off the page', async () => {
    expect(await failure('trim: {right: 105}', '#drawer', 16)).toMatch(/trim leaves none of the target/);
  });

  test('a remainder partly on the page is captured', async () => {
    expect(size(await run('trim: {right: 50}', '#drawer'))).toEqual([50, 100]);
  });
});
