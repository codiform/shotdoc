import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { parseDocument } from '../../src/parse/document.js';
import { drawAnnotations, planAnnotations } from '../../src/run/annotate.js';
import { Session } from '../../src/run/session.js';
import { runBlock } from '../../src/run/steps.js';
import { md, runThen, testConfig } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { countPixels, type Image, pixel, shoot } from '../helpers/shot.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

// Scale 1, so a CSS pixel is an image pixel. Colours and positions: see test/fixtures/annotate.css.
type RGB = [number, number, number];
const PINK: RGB = [255, 49, 160];
const WHITE: RGB = [255, 255, 255];
const GREY: RGB = [245, 245, 245];
const BLUE: RGB = [0, 0, 200];
const MASK: RGB = [85, 85, 85];

const run = (steps: string) => shoot(server.url, steps, { deviceScaleFactor: 1 });
const one = async (steps: string): Promise<Image> => (await run(steps)).s!;
const page = (shot: string, url = '/annotate.html') => `- goto: ${url}\n- screenshot: ${shot}`;
const failure = async (steps: string): Promise<string> => {
  try {
    await run(steps);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected failure');
};
const same = (a: Image, b: Image) => a.width === b.width && a.height === b.height && a.data.equals(b.data);

describe('highlight', () => {
  // #a is at 400,300 (100x50). The box is outset 5px: border x 395-397, outer white ring 393-394,
  // inner white ring 398-399. With padding 20 the image starts at 373,273 and is 154x104.
  test('a coloured border with white rings, and the element itself untouched', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 20, annotate: [{highlight: "#a"}]}'));
    expect([s.width, s.height]).toEqual([154, 104]);
    const at = (x: number, y: number) => pixel(s, x - 373, y - 273);
    expect(at(395, 325)).toEqual(PINK);
    expect(at(397, 325)).toEqual(PINK);
    expect(at(393, 325)).toEqual(WHITE);
    expect(at(394, 325)).toEqual(WHITE);
    expect(at(398, 325)).toEqual(WHITE);
    expect(at(399, 325)).toEqual(WHITE);
    expect(at(450, 296)).toEqual(PINK);
    for (let y = 300; y < 350; y++) for (let x = 400; x < 500; x++) expect(at(x, y)).toEqual(BLUE);
  });

  test('colour override', async () => {
    const s = await one(
      page('{name: s, target: "#a", padding: 20, annotate: [{highlight: {target: "#a", color: "#00aa00"}}]}'),
    );
    expect(pixel(s, 395 - 373, 325 - 273)).toEqual([0, 170, 0]);
    expect(countPixels(s, PINK)).toBe(0);
  });
});

describe('arrow', () => {
  // With padding 0 the image is the union of #a (400,300 100x50) and the arrow. The arrow is
  // 80x40 (40x80 up or down), 6px from the element, with its shaft through the middle of the side.
  test.each([
    ['left', 187, 50, 330 - 313, 25],
    ['right', 187, 50, 560 - 400, 25],
    ['top', 100, 137, 50, 239 - 213],
    ['bottom', 100, 137, 50, 411 - 300],
  ])('from %s is drawn on that side, pointing at the element', async (side, w, h, shaftX, shaftY) => {
    const s = await one(
      page(`{name: s, target: "#a", padding: 0, annotate: [{arrow: {target: "#a", from: ${side}}}]}`),
    );
    expect([s.width, s.height]).toEqual([w, h]);
    expect(pixel(s, shaftX, shaftY)).toEqual(PINK);
  });

  test('left is the default side', async () => {
    const a = await one(page('{name: s, target: "#a", padding: 0, annotate: [{arrow: "#a"}]}'));
    const b = await one(page('{name: s, target: "#a", padding: 0, annotate: [{arrow: {target: "#a", from: left}}]}'));
    expect(same(a, b)).toBe(true);
  });
});

describe('badge', () => {
  // The circle is 28px, centred on the element's top-left corner (400,300): 386-414 by 286-314.
  test('a circle on the top-left corner with a white border', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 0, annotate: [{badge: "#a"}]}'));
    expect([s.width, s.height]).toEqual([114, 64]);
    expect(pixel(s, 391 - 386, 300 - 286)).toEqual(PINK);
    expect(pixel(s, 0, 14)).toEqual(WHITE);
    expect(pixel(s, 1, 14)).toEqual(WHITE);
  });

  test('the number follows the order badges are listed', async () => {
    // #inner is at 340,430 inside #panel (300,400). Its badge is number 1 alone, number 2 after the panel's.
    const alone = await one(page('{name: s, target: "#panel", padding: 0, annotate: [{badge: "#inner"}]}'));
    const second = await one(
      page('{name: s, target: "#panel", padding: 0, annotate: [{badge: "#panel"}, {badge: "#inner"}]}'),
    );
    // The panel's badge reaches out to 286,386, so the second image starts there and the first at 300,400.
    let inside = 0;
    let outside = 0;
    for (let y = 416; y < 444; y++) {
      for (let x = 326; x < 354; x++) {
        if (pixel(alone, x - 300, y - 400).join() === pixel(second, x - 286, y - 386).join()) continue;
        const dx = x - 340;
        const dy = y - 430;
        if (dx * dx + dy * dy <= 12 * 12) inside++;
        else outside++;
      }
    }
    expect(inside).toBeGreaterThan(10); // the digit differs
    expect(outside).toBe(0); // the circle and its border do not
  });
});

describe('the page is not disturbed', () => {
  test('nothing else moves, and the image is the same size when everything lies inside the target', async () => {
    const { plain, marked } = await run(
      `${page('{name: plain, target: "#panel", padding: 0}')}\n- screenshot: {name: marked, target: "#panel", padding: 0, annotate: [{highlight: "#inner"}, {badge: "#inner"}]}`,
    );
    expect([marked!.width, marked!.height]).toEqual([plain!.width, plain!.height]);
    // #inner is at 340,430 (80x40) in a panel at 300,400: everything differing is near it.
    let far = 0;
    for (let y = 0; y < plain!.height; y++) {
      for (let x = 0; x < plain!.width; x++) {
        const doc = { x: 300 + x, y: 400 + y };
        if (doc.x > 340 - 20 && doc.x < 420 + 20 && doc.y > 430 - 20 && doc.y < 470 + 20) continue;
        if (pixel(plain!, x, y).join() !== pixel(marked!, x, y).join()) far++;
      }
    }
    expect(far).toBe(0);
  });

  test('drawing moves no element, adds no scroll and takes no pointer events', async () => {
    const s = await Session.start(testConfig(server.url, { deviceScaleFactor: 1 }));
    try {
      const p = await s.openPage();
      await p.goto(`${server.url}/annotate.html`);
      const probe = () =>
        p.evaluate(() => ({
          boxes: [...document.querySelectorAll('section')].map((e) => {
            const r = e.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height].join(',');
          }),
          height: document.documentElement.scrollHeight,
          children: document.documentElement.children.length,
          top: [document.elementFromPoint(400, 300)?.id, document.elementFromPoint(396, 325)?.tagName],
        }));
      const before = await probe();
      const plan = planAnnotations([
        { kind: 'highlight', target: { kind: 'css', selector: '#a' } },
        { kind: 'badge', target: { kind: 'css', selector: '#a' } },
      ]);
      const drawn = await drawAnnotations(
        p,
        plan.map((x) => ({ locator: p.locator('#a'), plan: x })),
      );
      const during = await probe();
      expect(during.boxes).toEqual(before.boxes);
      expect(during.height).toBe(before.height);
      expect(during.children).toBe(before.children + 1);
      // The badge sits over the element's corner and the border over the page: both are
      // transparent to the pointer, so what is underneath is hit.
      expect(during.top).toEqual(['a', 'BODY']);
      await drawn.remove();
      expect(await probe()).toEqual(before);
    } finally {
      await s.close();
    }
  });
});

describe('a page with hostile styles', () => {
  const shot = '{name: s, target: "#a", padding: 20, annotate: [{highlight: "#a"}, {arrow: "#b"}, {badge: "#a"}]}';

  test('the stylesheet really does reach elements added to the page', async () => {
    const reach = await runThen(md('- goto: /annotate.html#hostile'), server.url, async (p) =>
      p.evaluate(() => {
        const d = document.createElement('div');
        document.body.append(d);
        const c = getComputedStyle(d);
        return [c.borderTopWidth, c.marginTop, c.fontStyle];
      }),
    );
    expect(reach).toEqual(['6px', '20px', 'italic']);
  });

  test('annotations draw exactly as on a plain page', async () => {
    const plain = await one(page(shot));
    const hostile = await one(page(shot, '/annotate.html#hostile'));
    expect(countPixels(plain, PINK)).toBeGreaterThan(100);
    expect(same(plain, hostile)).toBe(true);
  });
});

describe('a page with a strict style policy', () => {
  test('the policy blocks style attributes, and annotations still draw', async () => {
    const blocked = await runThen(md('- goto: /annotate-csp.html'), server.url, async (p) =>
      p.evaluate(() => {
        const el = document.getElementById('b') as HTMLElement;
        el.setAttribute('style', 'background: rgb(255,0,0)');
        return getComputedStyle(el).backgroundColor;
      }),
    );
    expect(blocked).toBe('rgb(0, 150, 0)'); // the attribute was refused

    const s = await one(
      page('{name: s, target: "#a", padding: 20, annotate: [{highlight: "#a"}, {badge: "#a"}]}', '/annotate-csp.html'),
    );
    // The badge reaches further left and up than the box, so the image starts at 366,266.
    expect(pixel(s, 395 - 366, 325 - 266)).toEqual(PINK);
    expect(pixel(s, 450 - 366, 296 - 266)).toEqual(PINK);
    expect(pixel(s, 393 - 366, 325 - 266)).toEqual(WHITE);
  });
});

describe('the captured region', () => {
  test('an arrow outside the target is in the image and the image grows to hold it', async () => {
    // #inner is at 340,430; the arrow (from the left) spans 253-335 by 429-471, left of the panel (300-700).
    const s = await one(page('{name: s, target: "#panel", padding: 0, annotate: [{arrow: "#inner"}]}'));
    expect([s.width, s.height]).toEqual([447, 120]);
    expect(pixel(s, 279 - 253, 450 - 400)).toEqual(PINK);
  });

  test('a highlight on the target itself with no padding is whole, outer ring included', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 0, annotate: [{highlight: "#a"}]}'));
    expect([s.width, s.height]).toEqual([114, 64]);
    expect(pixel(s, 0, 32)).toEqual(WHITE);
    expect(pixel(s, 1, 32)).toEqual(WHITE);
    expect(pixel(s, 2, 32)).toEqual(PINK);
    expect(pixel(s, 56, 63)).toEqual(WHITE);
  });

  test('padding is added around the annotations too', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 10, annotate: [{arrow: "#a"}]}'));
    expect([s.width, s.height]).toEqual([187 + 20, 50 + 20]);
  });

  test('a region taller than the viewport has its annotations where their elements are', async () => {
    // #far is at 950,1300 in #tall (900,100 300x1600): the border is at x 945-947 of the page.
    const s = await one(page('{name: s, target: "#tall", padding: 0, annotate: [{highlight: "#far"}]}'));
    expect([s.width, s.height]).toEqual([300, 1600]);
    expect(pixel(s, 946 - 900, 1320 - 100)).toEqual(PINK);
    expect(pixel(s, 1000 - 900, 1295 - 100)).toEqual(PINK);
  });

  test('an annotation hanging off the page edge is cut there, not given blank space', async () => {
    // #edge is at 1220,600 (60x40) in a 1280-wide page; the arrow from the right starts at 1285.
    const s = await one(
      page('{name: s, target: "#edge", padding: 0, annotate: [{arrow: {target: "#edge", from: right}}]}'),
    );
    expect(s.width).toBe(60);
    expect(s.height).toBe(42);
  });

  test('an element that is hidden for the screenshot can still be annotated', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 20, hide: ["#a"], annotate: [{highlight: "#a"}]}'));
    expect(pixel(s, 450 - 373, 325 - 273)).toEqual(GREY);
    expect(pixel(s, 395 - 373, 325 - 273)).toEqual(PINK);
  });

  test('an element that appears shortly after the step starts is waited for', async () => {
    const s = await one(page('{name: s, target: "#a", padding: 0, annotate: [{highlight: "#late"}]}'));
    expect(countPixels(s, PINK)).toBeGreaterThan(100);
    expect(s.width).toBeGreaterThan(300); // the union reaches from #late (200,600) up to #a
  });
});

describe('annotation targets that cannot be used', () => {
  test('no match and several matches name the kind and the target', async () => {
    const [none, many] = await Promise.all([
      failure(page('{name: s, target: "#a", annotate: [{arrow: ".nope"}]}')),
      failure(page('{name: s, target: "#a", annotate: [{badge: ".twin"}]}')),
    ]);
    expect(none).toMatch(/doc\.md:1 \(step 2, css=#a\): arrow target css=\.nope: timed out after 10s/);
    expect(many).toMatch(
      /doc\.md:1 \(step 2, css=#a\): badge target css=\.twin: .*matched 2 elements but must match exactly one/,
    );
  });

  test('a colour the browser does not understand fails, naming the annotation and the colour', async () => {
    const m = await failure(
      page('{name: s, target: "#a", annotate: [{highlight: {target: "#a", color: "not-a-colour"}}]}'),
    );
    expect(m).toMatch(
      /doc\.md:1 \(step 2, css=#a\): highlight color "not-a-colour" is not a colour the browser understands/,
    );
  });
});

describe('annotations last for one screenshot', () => {
  const holds = async (steps: string, failing = false) => {
    const config = testConfig(server.url, { deviceScaleFactor: 1 });
    const [block] = parseDocument(md(steps), 'doc.md', { baseUrl: server.url });
    const s = await Session.start(config);
    try {
      let error: Error | undefined;
      try {
        await runBlock(block!, { session: s, file: 'doc.md', stageDir: '/tmp' });
      } catch (e) {
        error = e as Error;
      }
      expect(error !== undefined).toBe(failing);
      const p = s.page;
      return {
        error,
        left: await p.evaluate(() => ({
          global: typeof (window as unknown as { __shotdocOverlay?: unknown }).__shotdocOverlay,
          children: [...document.documentElement.children].map((e) => e.tagName),
          hidden: typeof (window as unknown as { __shotdocHidden?: unknown }).__shotdocHidden,
        })),
      };
    } finally {
      await s.close();
    }
  };

  test('nothing the annotations added is left on the page', async () => {
    const { left } = await holds(
      `${page('{name: s, target: "#a", annotate: [{highlight: "#a"}, {badge: "#a"}, {arrow: "#b"}]}')}`,
    );
    expect(left).toEqual({ global: 'undefined', children: ['HEAD', 'BODY'], hidden: 'undefined' });
  });

  test('a later screenshot without annotate shows none', async () => {
    const { first, second } = await run(
      `${page('{name: first, target: "#a", padding: 20, annotate: [{highlight: "#a"}]}')}\n- screenshot: {name: second, target: "#a", padding: 20}`,
    );
    expect(pixel(first!, 395 - 373, 325 - 273)).toEqual(PINK);
    expect(countPixels(second!, PINK)).toBe(0);
    expect([second!.width, second!.height]).toEqual([140, 90]);
  });

  test('a screenshot that fails after drawing leaves nothing behind', async () => {
    // Masking the whole body makes the image one colour, so the blank check fails it after the drawing.
    const { error, left } = await holds(
      `${page('{name: s, target: "#a", annotate: [{highlight: "#a"}], mask: ["body"]}')}`,
      true,
    );
    expect(error?.message).toMatch(/screenshot "s" is blank/);
    expect(left).toEqual({ global: 'undefined', children: ['HEAD', 'BODY'], hidden: 'undefined' });
  });
});

describe('masks and annotations', () => {
  test('a mask covers an annotation over the masked element', async () => {
    // The badge's circle reaches into #a's corner; inside #a's box the mask is painted over it.
    const plain = await one(page('{name: s, target: "#a", padding: 20, annotate: [{badge: "#a"}]}'));
    const masked = await one(page('{name: s, target: "#a", padding: 20, mask: ["#a"], annotate: [{badge: "#a"}]}'));
    const at = (img: Image, x: number, y: number) => pixel(img, x - 366, y - 266);
    expect(at(plain, 405, 305)).toEqual(PINK);
    expect(at(masked, 405, 305)).toEqual(MASK);
    expect(at(masked, 450, 325)).toEqual(MASK);
    expect(at(masked, 391, 300)).toEqual(PINK); // the part of the badge outside the masked box stays
  });
});
