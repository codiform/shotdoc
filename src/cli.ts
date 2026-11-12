#!/usr/bin/env node
import { dirname, relative } from 'node:path';
import { build } from './build.js';
import { ShotdocError, ShotdocErrors } from './errors.js';

const USAGE = `Usage: shotdoc build [--config <file>] <file.md>

Runs the shotdoc blocks in <file.md> and writes the built Markdown and screenshots
to the output directory (default: build/).

Settings come from shotdoc.config.yaml: the nearest one from the directory of <file.md>
upward, otherwise the one in the current directory. --config <file> names a file instead.`;

interface Args {
  file: string;
  config?: string;
}

/** Parses the arguments after `build`; returns an error message when they are malformed. */
function parseBuildArgs(args: string[]): Args | string {
  let file: string | undefined;
  let config: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    if (arg === '--config' || arg.startsWith('--config=')) {
      if (config !== undefined) return '--config was given more than once';
      const value = arg === '--config' ? args[++i] : arg.slice('--config='.length);
      if (!value) return '--config needs a file path';
      config = value;
    } else if (arg.startsWith('-')) {
      return `unknown option ${arg}`;
    } else if (file !== undefined) {
      return 'only one source file can be built at a time';
    } else {
      file = arg;
    }
  }
  if (file === undefined) return 'no source file given';
  return config === undefined ? { file } : { file, config };
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (command === '--help' || command === '-h') {
    console.log(USAGE);
    return 0;
  }
  if (command !== 'build') {
    console.error(USAGE);
    return 2;
  }
  const args = parseBuildArgs(rest);
  if (typeof args === 'string') {
    console.error(`error: ${args}\n\n${USAGE}`);
    return 2;
  }
  try {
    const result = await build(args.file, process.cwd(), { config: args.config });
    if (result.configPath && dirname(result.configPath) !== process.cwd()) {
      console.log(`Using ${relative(process.cwd(), result.configPath)}`);
    }
    console.log(
      `Built ${relative(process.cwd(), result.builtPath)} (${result.images.length} image${result.images.length === 1 ? '' : 's'})`,
    );
    return 0;
  } catch (e) {
    if (e instanceof ShotdocErrors) {
      for (const err of e.errors) console.error(`error: ${err.message}`);
    } else if (e instanceof ShotdocError) {
      console.error(`error: ${e.message}`);
    } else {
      console.error(`error: unexpected failure: ${e instanceof Error ? (e.stack ?? e.message) : String(e)}`);
    }
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
