import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { md, runMd, runThen } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';
import { countPixels, shoot } from '../helpers/shot.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

const RED: [number, number, number] = [220, 0, 0]; // the delete control in rows.html
const ROW = `"li:has-text('Ship it')"`;

const fails = async (steps: string): Promise<string> => {
  try {
    await runMd(md(steps), server.url);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the build to fail');
};

describe('dblclick', () => {
  test('opens edit mode', async () => {
    const editing = await runThen(
      md('- goto: /rows.html\n- dblclick: {text: Write the docs}'),
      server.url,
      async (page) => page.locator('input.edit').isVisible(),
    );
    expect(editing).toBe(true);
  });

  test('a plain click does not open edit mode', async () => {
    const editing = await runThen(md('- goto: /rows.html\n- click: {text: Write the docs}'), server.url, async (page) =>
      page.locator('input.edit').count(),
    );
    expect(editing).toBe(0);
  });

  test('the whole edit flow: dblclick, fill, press Enter commits', async () => {
    const text = await runThen(
      md(
        `- goto: /rows.html
- dblclick: {text: Write the docs}
- fill: {target: "input.edit", value: Write more docs}
- press: Enter`,
      ),
      server.url,
      async (page) => page.locator('li').first().innerText(),
    );
    expect(text).toBe('Write more docs');
  });
});

describe.each(['dblclick', 'hover'])('%s failures', (step) => {
  test('a target that never appears fails after the timeout and names it', async () => {
    const t0 = Date.now();
    const m = await fails(`- goto: /rows.html\n- ${step}: {text: Nothing like this}`);
    expect(Date.now() - t0).toBeGreaterThan(9000);
    expect(m).toMatch(/doc\.md:1 \(step 2, text="Nothing like this"\): timed out after 10s/);
  });

  test('a target matching three elements gives the count and the target', async () => {
    const m = await fails(`- goto: /rows.html\n- ${step}: "li label"`);
    expect(m).toMatch(/\(step 2, css=li label\)/);
    expect(m).toMatch(/matched 3 elements/);
  });
});

describe('hover', () => {
  const rowShot = '- screenshot: {name: row, target: ' + ROW + ', padding: 0}';

  test('without a hover the delete control is not in the image', async () => {
    const { row } = await shoot(server.url, ['- goto: /rows.html\n' + rowShot]);
    expect(countPixels(row!, RED)).toBe(0);
  });

  test('a hover makes the delete control appear in the image', async () => {
    const { row } = await shoot(server.url, [`- goto: /rows.html\n- hover: ${ROW}\n${rowShot}`]);
    // A 24x24 css pixel control at scale 2.
    expect(countPixels(row!, RED)).toBe(24 * 24 * 4);
  });

  test('the hover is still in effect for a screenshot in a later block', async () => {
    const { row } = await shoot(server.url, [`- goto: /rows.html\n- hover: ${ROW}`, rowShot]);
    expect(countPixels(row!, RED)).toBe(24 * 24 * 4);
  });

  test('another pointer action moves the hover away', async () => {
    const { row } = await shoot(server.url, [
      `- goto: /rows.html\n- hover: ${ROW}\n- hover: {text: Write the docs}\n${rowShot}`,
    ]);
    expect(countPixels(row!, RED)).toBe(0);
  });
});

describe('unhover', () => {
  const rowShot = `- screenshot: {name: row, target: ${ROW}, padding: 0}`;

  test('ends a hover: the delete control is in the image after hover, gone after unhover', async () => {
    const { shown, gone } = await shoot(server.url, [
      `- goto: /rows.html\n- hover: ${ROW}\n- screenshot: {name: shown, target: ${ROW}, padding: 0}\n- unhover:\n- screenshot: {name: gone, target: ${ROW}, padding: 0}`,
    ]);
    expect(countPixels(shown!, RED)).toBe(24 * 24 * 4);
    expect(countPixels(gone!, RED)).toBe(0);
  });

  test('works when unhover starts a later block', async () => {
    const { row } = await shoot(server.url, [`- goto: /rows.html\n- hover: ${ROW}`, `- unhover:\n${rowShot}`]);
    expect(countPixels(row!, RED)).toBe(0);
  });

  test('before any goto fails with the begin-with-a-goto message', async () => {
    const m = await fails('- unhover:');
    expect(m).toMatch(/doc\.md:1 \(step 1\): .*begin the first block with a `goto` step/);
  });
});
