// Rebuilds every example: each Markdown file in examples/*/input/ is built with the compiled CLI.
// Every example is attempted even if an earlier one fails, and the exit code says whether any did.
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cli = join(root, 'dist', 'cli.js');
const examples = join(root, 'examples');

const sources = readdirSync(examples, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .flatMap((e) => {
    const input = join(examples, e.name, 'input');
    return readdirSync(input, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.md'))
      .map((f) => relative(root, join(input, f.name)));
  })
  .sort();

const failed = [];
for (const source of sources) {
  console.log(`\n==> ${source}`);
  const run = spawnSync(process.execPath, [cli, 'build', source], { cwd: root, stdio: 'inherit' });
  if (run.status !== 0) failed.push(source);
}

console.log(`\n${sources.length - failed.length} of ${sources.length} examples built.`);
if (failed.length) {
  console.error(`Failed:\n${failed.map((f) => `  ${f}`).join('\n')}`);
  process.exit(1);
}
