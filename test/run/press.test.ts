import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { md, runMd, runThen } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

const logAfter = (steps: string) =>
  runThen(md(steps), server.url, async (page) => (await page.locator('#log').innerText()).trim().split('\n'));

const fails = async (steps: string): Promise<string> => {
  try {
    await runMd(md(steps), server.url);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the build to fail');
};

describe('press', () => {
  test('Enter right after a fill goes to the field that has focus', async () => {
    const log = await logAfter('- goto: /keys.html\n- fill: {target: "#field", value: ada}\n- press: Enter');
    expect(log).toEqual(['Enter||field']);
  });

  test('with a target, the element is focused first', async () => {
    const log = await logAfter('- goto: /keys.html\n- click: "#field"\n- press: {key: Escape, target: "#other"}');
    expect(log).toEqual(['Escape||other']);
  });

  test('a modifier is held while the key is pressed', async () => {
    const log = await logAfter('- goto: /keys.html\n- click: "#field"\n- press: Control+A');
    expect(log).toEqual(['Control|C|field', 'A|C|field']);
  });

  test('a single character key', async () => {
    const log = await logAfter('- goto: /keys.html\n- click: "#field"\n- press: x');
    expect(log).toEqual(['x||field']);
  });

  test('a mistyped key name fails the step and names the key', async () => {
    const m = await fails('- goto: /keys.html\n- click: "#field"\n- press: Entr');
    expect(m).toMatch(/doc\.md:1 \(step 3, key Entr\): unknown key "Entr"/);
  });

  test('a mistyped key with a target also names the key', async () => {
    const m = await fails('- goto: /keys.html\n- press: {key: Entr, target: "#field"}');
    expect(m).toMatch(/\(step 2, css=#field\): unknown key "Entr"/);
  });

  test('press with a target that never appears fails after the timeout and names it', async () => {
    const t0 = Date.now();
    const m = await fails('- goto: /keys.html\n- press: {key: Enter, target: "#nope"}');
    expect(Date.now() - t0).toBeGreaterThan(9000);
    expect(m).toMatch(/\(step 2, css=#nope\): timed out after 10s/);
  });

  test('press before any goto says to begin with a goto', async () => {
    const m = await fails('- press: Enter');
    expect(m).toMatch(/doc\.md:1 \(step 1, key Enter\).*begin the first block with a `goto`/);
  });
});
