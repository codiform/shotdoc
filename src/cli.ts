#!/usr/bin/env node
import { dirname, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { build } from './build.js';
import { LoginRequiredError, ShotdocError, ShotdocErrors } from './errors.js';
import { install } from './install.js';
import { login } from './login.js';

/** Exit statuses. */
const EXIT_OK = 0;
const EXIT_FAILURE = 1;
/** The command line itself was wrong. */
const EXIT_USAGE = 2;
/** A build needs a saved login and has none that works. */
const EXIT_LOGIN_REQUIRED = 3;

const USAGE = `Usage: shotdoc build [--config <file>] <file.md>
       shotdoc login [--config <file>] [<file.md>]
       shotdoc install [<options>] [<browser>...]

Runs the shotdoc blocks in <file.md> and writes the built Markdown and screenshots
to the output directory (default: build/).

Settings come from shotdoc.config.yaml: the nearest one from the directory of <file.md>
upward, otherwise the one in the current directory. --config <file> names a file instead.

shotdoc login opens a browser at the configuration's \`auth.url\` so you can log in by hand, then
saves the session for builds. A build exits with status 3 when the saved login is missing or no
longer valid.

shotdoc install installs the browser shotdoc drives (Chromium unless you name another) using the
Playwright that shotdoc itself uses, so the browser matches. Options go to Playwright's installer:
shotdoc install --with-deps, shotdoc install --dry-run.`;

interface LoginArgs {
  file?: string;
  config?: string;
}

/** Parses the arguments after `build` or `login`; returns an error message when they are malformed. */
function parseArgs(args: string[], sourceRequired: boolean): LoginArgs | string {
  let file: string | undefined;
  let config: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === '--config' || arg.startsWith('--config=')) {
      if (config !== undefined) {
        return '--config was given more than once';
      }
      const value = arg === '--config' ? args[++i] : arg.slice('--config='.length);
      if (!value) {
        return '--config needs a file path';
      }
      config = value;
    } else if (arg.startsWith('-')) {
      return `unknown option ${arg}`;
    } else if (file !== undefined) {
      return sourceRequired ? 'only one source file can be built at a time' : 'only one source file can be given';
    } else {
      file = arg;
    }
  }
  if (file === undefined && sourceRequired) {
    return 'no source file given';
  }
  return { ...(file === undefined ? {} : { file }), ...(config === undefined ? {} : { config }) };
}

function report(e: unknown): number {
  if (e instanceof ShotdocErrors) {
    for (const err of e.errors) {
      console.error(`error: ${err.message}`);
    }
  } else if (e instanceof ShotdocError) {
    console.error(`error: ${e.message}`);
  } else {
    console.error(`error: unexpected failure: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
  }
  return e instanceof LoginRequiredError ? EXIT_LOGIN_REQUIRED : EXIT_FAILURE;
}

async function runLoginCommand(rest: string[]): Promise<number> {
  const args = parseArgs(rest, false);
  if (typeof args === 'string') {
    console.error(`error: ${args}\n\n${USAGE}`);
    return EXIT_USAGE;
  }
  // Closed on every exit, so a browser closed while the question is pending cannot keep stdin open.
  let rl: ReturnType<typeof createInterface> | undefined;
  try {
    const result = await login(args.file, process.cwd(), {
      ...(args.config === undefined ? {} : { config: args.config }),
      preflight: () => {
        if (!process.stdin.isTTY) {
          throw new ShotdocError('shotdoc login needs an interactive terminal to wait for you');
        }
      },
      ready: async (url) => {
        console.log(`Opening ${url}\nLog in in the browser window, including any MFA, then press Enter here.`);
        rl = createInterface({ input: process.stdin, output: process.stdout });
        await rl.question('Press Enter when you are logged in... ');
      },
    });
    if (result.configPath && dirname(result.configPath) !== process.cwd()) {
      console.log(`Using ${relative(process.cwd(), result.configPath)}`);
    }
    console.log(`Saved the login to ${relative(process.cwd(), result.state)}`);
    if (result.warning) {
      console.error(`warning: ${result.warning}`);
    }
    return EXIT_OK;
  } catch (e) {
    return report(e);
  } finally {
    rl?.close();
  }
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === '--help' || command === '-h') {
    console.log(USAGE);
    return EXIT_OK;
  }
  if (command === 'login') {
    return runLoginCommand(rest);
  }
  if (command === 'install') {
    try {
      return await install(rest);
    } catch (e) {
      return report(e);
    }
  }
  if (command !== 'build') {
    console.error(USAGE);
    return EXIT_USAGE;
  }
  const args = parseArgs(rest, true);
  if (typeof args === 'string') {
    console.error(`error: ${args}\n\n${USAGE}`);
    return EXIT_USAGE;
  }
  try {
    const result = await build(args.file as string, process.cwd(), { config: args.config });
    if (result.configPath && dirname(result.configPath) !== process.cwd()) {
      console.log(`Using ${relative(process.cwd(), result.configPath)}`);
    }
    console.log(
      `Built ${relative(process.cwd(), result.builtPath)} (${result.images.length} image${result.images.length === 1 ? '' : 's'})`,
    );
    return EXIT_OK;
  } catch (e) {
    return report(e);
  }
}

process.exitCode = await main(process.argv.slice(2));
