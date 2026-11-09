#!/usr/bin/env node
import { relative } from 'node:path';
import { build } from './build.js';
import { ShotdocError, ShotdocErrors } from './errors.js';

const USAGE = `Usage: shotdoc build <file.md>

Runs the shotdoc blocks in <file.md> and writes the built Markdown and screenshots
to the output directory (default: build/). Settings come from shotdoc.config.yaml.`;

export async function main(argv: string[]): Promise<number> {
  const [command, file, ...rest] = argv;
  if (command === '--help' || command === '-h') {
    console.log(USAGE);
    return 0;
  }
  if (command !== 'build' || !file || rest.length) {
    console.error(USAGE);
    return 2;
  }
  try {
    const result = await build(file);
    console.log(`Built ${relative(process.cwd(), result.builtPath)} (${result.images.length} image${result.images.length === 1 ? '' : 's'})`);
    return 0;
  } catch (e) {
    if (e instanceof ShotdocErrors) {
      for (const err of e.errors) console.error(`error: ${err.message}`);
    } else if (e instanceof ShotdocError) {
      console.error(`error: ${e.message}`);
    } else {
      console.error(`error: unexpected failure: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
    }
    return 1;
  }
}

process.exitCode = await main(process.argv.slice(2));
