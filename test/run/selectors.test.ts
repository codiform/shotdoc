import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { startFixtureServer, type FixtureServer } from '../helpers/server.js';
import { md, runMd, runThen } from '../helpers/run.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

/** Runs steps against rows.html and returns the text of every completed row. */
const completedAfter = (steps: string) =>
  runThen(md(`- goto: /rows.html\n${steps}`), server.url, (page) => page.locator('li.done').allInnerTexts());

const fails = async (steps: string): Promise<string> => {
  try {
    await runMd(md(`- goto: /rows.html\n${steps}`), server.url);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the build to fail');
};

describe('Playwright selector syntax in selector strings', () => {
  test(':has-text() with >> role= picks the checkbox in one row', async () => {
    expect(await completedAfter(`- click: "li:has-text('Take screenshots') >> role=checkbox"`)).toEqual(['Take screenshots']);
  });

  test(':nth-child() picks one row', async () => {
    expect(await completedAfter('- click: "ul > li:nth-child(3) input.toggle"')).toEqual(['Ship it']);
  });

  test('scoping works for a hover-only control: hover a row, then click its delete button', async () => {
    const remaining = await runThen(
      md(`- goto: /rows.html
- hover: "li:has-text('Ship it')"
- click: "li:has-text('Ship it') .destroy"`),
      server.url,
      (page) => page.locator('li label').allInnerTexts(),
    );
    expect(remaining).toEqual(['Write the docs', 'Take screenshots']);
  });

  test('a target that matches all three checkboxes still fails with the count', async () => {
    const m = await fails('- click: {role: checkbox, name: Toggle Todo}');
    expect(m).toMatch(/\(step 2, role=checkbox name="Toggle Todo"\)/);
    expect(m).toMatch(/matched 3 elements/);
  });
});

describe('a selector with a syntax error', () => {
  test.each(['li:has-text((', '[[bad'])('%s fails the step in one readable line naming the target', async (selector) => {
    const m = await fails(`- click: ${JSON.stringify(selector)}`);
    expect(m).not.toContain('\n');
    expect(m).toMatch(new RegExp(`^doc\\.md:1 \\(step 2, css=${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\): `));
    expect(m).toMatch(/Unexpected token/);
    expect(m).not.toMatch(/locator\.click/);
  });
});
