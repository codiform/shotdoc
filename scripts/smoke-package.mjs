// Smoke test of the package as a user receives it: pack, install the tarball into an empty project,
// and run the installed `shotdoc`. It catches what testing the repository checkout cannot: a file
// missing from the tarball, a wrong `bin` path, an undeclared dependency.
//
// Needs the Chromium that matches the repository's Playwright (the one `npx playwright install
// chromium` installs for the tests). Run with `npm run smoke:package`.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FENCE = '```';
const work = mkdtempSync(join(tmpdir(), 'shotdoc-smoke-'));

function run(command, args, cwd) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout ?? '', output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

function must(what, ok, detail) {
  if (!ok) {
    throw new Error(`${what}${detail ? `\n${detail}` : ''}`);
  }
  console.log(`ok: ${what}`);
}

try {
  // Pack. `prepack` compiles first, so the tarball is never stale.
  const packed = run('npm', ['pack', '--json', '--pack-destination', work], root);
  must('npm pack succeeds', packed.status === 0, packed.output);
  const tarball = join(work, JSON.parse(packed.stdout.slice(packed.stdout.indexOf('[')))[0].filename);

  // Install into an empty project. Playwright is pinned to the repository's version so the Chromium
  // already installed for the tests matches; without that, the install may pick a newer build.
  const playwright = JSON.parse(readFileSync(join(root, 'node_modules', 'playwright', 'package.json'), 'utf8')).version;
  const project = join(work, 'project');
  mkdirSync(project);
  writeFileSync(join(project, 'package.json'), '{"name":"smoke","private":true,"type":"module"}');
  const installed = run('npm', ['install', '--no-audit', '--no-fund', tarball, `playwright@${playwright}`], project);
  must('the tarball installs into an empty project', installed.status === 0, installed.output);

  // Run the installed bin itself, not `node dist/cli.js`, so the shebang and the `bin` path are tested.
  const bin = join(project, 'node_modules', '.bin', 'shotdoc');
  const shotdoc = (...args) => run(bin, args, project);

  const help = shotdoc('--help');
  must(
    'shotdoc --help prints usage and exits 0',
    help.status === 0 && help.output.includes('Usage: shotdoc'),
    help.output,
  );

  // The installed copy finds its own Playwright's installer. A dry run downloads nothing.
  const installDryRun = shotdoc('install', '--dry-run', 'chromium');
  must(
    'shotdoc install --dry-run chromium finds the installer and lists where the browser goes',
    installDryRun.status === 0 && installDryRun.output.includes('Install location'),
    `status ${installDryRun.status}\n${installDryRun.output}`,
  );

  writeFileSync(join(project, 'bad.md'), `${FENCE}shotdoc\n- frobnicate: x\n${FENCE}\n`);
  const bad = shotdoc('build', 'bad.md');
  must(
    'a document with an unknown step fails and names the step',
    bad.status !== 0 && bad.output.includes('frobnicate'),
    `status ${bad.status}\n${bad.output}`,
  );

  // A local page, so the build needs no network.
  writeFileSync(join(project, 'page.html'), '<!doctype html><title>Smoke</title><h1>Hello from the smoke test</h1>');
  const url = pathToFileURL(join(project, 'page.html')).href;
  writeFileSync(
    join(project, 'good.md'),
    `# Good\n\n${FENCE}shotdoc\n- goto: ${url}\n- screenshot: {name: page}\n${FENCE}\n`,
  );
  const good = shotdoc('build', 'good.md');
  must('a document that drives a local page builds', good.status === 0, `status ${good.status}\n${good.output}`);
  const markdown = join(project, 'build', 'good.md');
  const image = join(project, 'build', 'images', 'good', 'page.png');
  must('the built Markdown is written', existsSync(markdown));
  must('the screenshot is written', existsSync(image) && statSync(image).size > 0);

  console.log('\npackage smoke test passed');
} catch (e) {
  console.error(`\npackage smoke test FAILED: ${e.message}`);
  process.exitCode = 1;
} finally {
  rmSync(work, { recursive: true, force: true });
}
