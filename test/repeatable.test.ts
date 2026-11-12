import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, afterEach, beforeAll, beforeEach, expect, test } from 'vitest';
import { build } from '../src/build.js';
import { type FixtureServer, startFixtureServer } from './helpers/server.js';
import { countPixels } from './helpers/shot.js';

let server: FixtureServer;
let cwd: string;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(() => server.close());
beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'shotdoc-repeat-'));
  writeFileSync(join(cwd, 'shotdoc.config.yaml'), `baseUrl: ${server.url}\n`);
});
afterEach(() => rmSync(cwd, { recursive: true, force: true }));

/** Every image the last build wrote, by file name. */
const images = (): Map<string, Buffer> => {
  const dir = join(cwd, 'build', 'images', 'doc');
  return new Map(readdirSync(dir).map((f) => [f, readFileSync(join(dir, f))]));
};

const DOCUMENT = `# Repeatable

\`\`\`shotdoc
- goto: /spinner.html
- screenshot: {name: viewport}
- screenshot: {name: stage, target: "#stage"}
\`\`\`

\`\`\`shotdoc
- goto: /rows.html
- screenshot: {name: row, target: "li:has-text('Ship it')"}
- goto: /form.html
- screenshot: {name: form}
\`\`\`
`;

test('building the same document twice gives byte-identical images, with an endless CSS animation and a transition on the page', async () => {
  writeFileSync(join(cwd, 'doc.md'), DOCUMENT);
  await build('doc.md', cwd);
  const first = images();
  expect([...first.keys()].sort()).toEqual(['form.png', 'row.png', 'stage.png', 'viewport.png']);

  // The transition ran to its end state (the blue square is fully visible), and the endless
  // animation was settled (the red square is present).
  const stage = PNG.sync.read(first.get('stage.png') as Buffer);
  expect(countPixels(stage, [30, 30, 200])).toBe(80 * 80 * 4);
  expect(countPixels(stage, [200, 30, 30])).toBeGreaterThan(0);

  await build('doc.md', cwd);
  const second = images();
  for (const [name, bytes] of first) {
    expect(second.get(name)?.equals(bytes), `${name} differs between builds`).toBe(true);
  }
});
