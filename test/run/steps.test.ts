import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { md, runMd, runThen } from '../helpers/run.js';
import { type FixtureServer, startFixtureServer } from '../helpers/server.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());

const fails = async (source: string): Promise<string> => {
  try {
    await runMd(source, server.url);
  } catch (e) {
    return (e as Error).message;
  }
  throw new Error('expected the build to fail');
};

describe('session', () => {
  test('uses configured viewport, scale, en-US and UTC', async () => {
    const { testConfig } = await import('../helpers/run.js');
    const { Session } = await import('../../src/run/session.js');
    const s = await Session.start(
      testConfig(server.url, { viewport: { width: 900, height: 600 }, deviceScaleFactor: 1 }),
    );
    try {
      const page = await s.openPage();
      await page.goto(`${server.url}/env.html`);
      const env = JSON.parse(await page.locator('#env').innerText());
      expect(env).toEqual({ lang: 'en-US', tz: 'UTC', w: 900, h: 600, dpr: 1 });
    } finally {
      await s.close();
    }
  });

  test('acting before goto fails and says to begin with a goto', async () => {
    const m = await fails(md('- click: "#save"'));
    expect(m).toMatch(/doc\.md:1 \(step 1, css=#save\).*begin the first block with a `goto`/);
  });
});

describe('goto under a base path', () => {
  const where = (base: string, steps: string) =>
    runThen(md(steps), base, async (page) => page.locator('#where').innerText());

  test.each(['/app/', '/app'])('goto: / reaches the context root of a base URL ending %s', async (suffix) => {
    expect(await where(`${server.url}${suffix}`, '- goto: /')).toBe('app home');
  });

  test('a path under the context root stays under it', async () => {
    expect(await where(`${server.url}/app`, '- goto: /other.html')).toBe('app other');
    expect(await where(`${server.url}/app/`, '- goto: other.html')).toBe('app other');
  });

  test('an absolute URL still reaches anything', async () => {
    expect(await where(`${server.url}/app/`, `- goto: ${server.url}/form.html\n- goto: /other.html`)).toBe('app other');
  });
});

describe('goto', () => {
  test('relative and absolute URLs', async () => {
    const urlAfter = (steps: string) => runThen(md(steps), server.url, async (page) => page.url());
    expect(await urlAfter('- goto: /form.html')).toBe(`${server.url}/form.html`);
    expect(await urlAfter(`- goto: ${server.url}/next.html`)).toBe(`${server.url}/next.html`);
  });

  test('404 fails with URL and status', async () => {
    const m = await fails(md('- goto: /missing.html'));
    expect(m).toContain(`${server.url}/missing.html`);
    expect(m).toContain('404');
    expect(m).toMatch(/doc\.md:1 \(step 1/);
  });

  test('a failing step prevents later steps', async () => {
    const m = await fails(md('- goto: /missing.html\n- goto: /form.html\n- click: "#nope"'));
    expect(m).toContain('404');
    expect(m).not.toContain('#nope');
  });
});

describe('click and fill', () => {
  test('each target kind', async () => {
    const out = (steps: string) =>
      runThen(md(`- goto: /form.html\n${steps}`), server.url, async (page) => page.locator('#out').innerText());
    expect(await out('')).toBe('');
    expect(await out('- click: "#save"')).toBe('saved');
    expect(await out('- click: {role: button, name: Save}')).toBe('saved');
    const next = await runThen(
      md('- goto: /form.html\n- click: {text: Next page}\n- wait: {visible: {text: Second page}}'),
      server.url,
      async (page) => page.url(),
    );
    expect(next).toBe(`${server.url}/next.html`);
  });

  test('fill by label and css, then verify through the page', async () => {
    const { Session } = await import('../../src/run/session.js');
    const { testConfig } = await import('../helpers/run.js');
    const { parseDocument } = await import('../../src/parse/document.js');
    const { runBlock } = await import('../../src/run/steps.js');
    const config = testConfig(server.url);
    const s = await Session.start(config);
    try {
      const [b] = parseDocument(
        md(
          '- goto: /form.html\n- fill: {target: {label: Email}, value: ada}\n- fill: {target: "#name", value: lovelace}',
        ),
        'doc.md',
        { baseUrl: server.url },
      );
      await runBlock(b!, { session: s, file: 'doc.md', stageDir: '/tmp' });
      expect(await s.page.inputValue('#email')).toBe('ada');
      expect(await s.page.inputValue('#name')).toBe('lovelace');
    } finally {
      await s.close();
    }
  });

  test('target matching two elements gives count and target', async () => {
    const m = await fails(md('- goto: /form.html\n- click: ".dup"'));
    expect(m).toMatch(/css=\.dup/);
    expect(m).toMatch(/matched 2 elements/);
  });

  test('missing element fails after the timeout and names the target', async () => {
    const t0 = Date.now();
    const m = await fails(md('- goto: /form.html\n- click: {role: button, name: Nope}'));
    expect(Date.now() - t0).toBeGreaterThan(9000);
    expect(m).toMatch(/doc\.md:1 \(step 2, role=button name="Nope"\): timed out after 10s/);
  });
});

describe('wait', () => {
  const upd = '- goto: /delayed.html\n- click: "#update"\n';
  const pageAfter = (steps: string) =>
    runThen(md(upd + steps), server.url, async (page) => ({
      count: await page.locator('#count').innerText(),
      spinners: await page.locator('#spinner').count(),
      late: await page.locator('#late').count(),
    }));

  // The page changes 300-400 ms after the click, so a wait that returned early would see the old state.
  test('text', async () => {
    expect(await pageAfter('- wait: {text: 2 items left}')).toMatchObject({ count: '2 items left' });
  });
  test('visible and hidden', async () => {
    expect(await pageAfter('- wait: {hidden: "#spinner"}\n- wait: {visible: "#late"}')).toMatchObject({
      spinners: 0,
      late: 1,
    });
  });
  test('milliseconds', async () => {
    expect(await pageAfter('- wait: 700')).toMatchObject({ count: '2 items left', late: 1 });
  });
  test('network idle completes', async () => {
    await expect(runMd(md(`${upd}- wait: {network: idle}`), server.url)).resolves.toBeDefined();
  });
  test('a condition that never holds names it', async () => {
    const m = await fails(md('- goto: /delayed.html\n- wait: {text: never appears}'));
    expect(m).toMatch(
      /\(step 2, the text "never appears" to appear\): timed out after 10s waiting for the text "never appears" to appear/,
    );
  });
});

describe('continuous session', () => {
  test('block two acts on the page block one opened', async () => {
    await runMd(
      md('- goto: /form.html\n- click: {text: Next page}', '- click: "#here"\n- wait: {visible: "#here"}'),
      server.url,
    );
  });

  test('each build starts with no stored data', async () => {
    const { Session } = await import('../../src/run/session.js');
    const { testConfig } = await import('../helpers/run.js');
    const read = async () => {
      const s = await Session.start(testConfig(server.url));
      try {
        const p = await s.openPage();
        await p.goto(`${server.url}/storage.html`);
        return await p.locator('#v').innerText();
      } finally {
        await s.close();
      }
    };
    expect(await read()).toBe('empty');
    expect(await read()).toBe('empty');
  });
});
