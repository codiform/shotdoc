import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { findConfig, loadConfig } from './config.js';
import { buildDocument } from './emit.js';
import { ShotdocError } from './errors.js';
import { parseDocument } from './parse/document.js';
import { runDocument } from './run/run.js';

export interface BuildResult {
  /** Absolute path of the configuration file used, if any. */
  configPath: string | undefined;
  builtPath: string;
  imageDir: string | undefined;
  images: string[];
}

/**
 * Builds one source document. Reads the source, never writes to it, and only touches the
 * output directory after every step has succeeded.
 */
export async function build(
  sourcePath: string,
  cwd: string = process.cwd(),
  options: { config?: string } = {},
): Promise<BuildResult> {
  const absSource = resolve(cwd, sourcePath);
  if (!existsSync(absSource)) {
    throw new ShotdocError(`source file not found: ${sourcePath}`);
  }
  const configPath = findConfig(sourcePath, cwd, options.config);
  const config = loadConfig(configPath, cwd);
  const name = basename(absSource);
  const stem = basename(name, extname(name));
  const builtPath = join(config.outDir, name);
  if (resolve(builtPath) === absSource) {
    throw new ShotdocError(
      `the built file would overwrite the source (${sourcePath}): set a different \`outDir\` in shotdoc.config.yaml`,
    );
  }

  const source = readFileSync(absSource, 'utf8');
  const blocks = parseDocument(source, sourcePath, { baseUrl: config.baseUrl });

  mkdirSync(config.outDir, { recursive: true });
  const stageDir = mkdtempSync(join(config.outDir, '.shotdoc-stage-'));
  try {
    const shots = await runDocument(blocks, { config, file: sourcePath, stageDir });
    const built = buildDocument(source, blocks, shots, (n) => `images/${stem}/${n}.png`);

    // Everything succeeded: replace the images, then write the document.
    const imageDir = join(config.outDir, 'images', stem);
    rmSync(imageDir, { recursive: true, force: true });
    const names = [...shots.values()].flat().map((s) => `${s.name}.png`);
    if (names.length) {
      mkdirSync(join(config.outDir, 'images'), { recursive: true });
      renameSync(stageDir, imageDir);
    }
    writeFileSync(builtPath, built);
    return {
      configPath,
      builtPath,
      imageDir: names.length ? imageDir : undefined,
      images: names.map((n) => join(imageDir, n)),
    };
  } finally {
    rmSync(stageDir, { recursive: true, force: true });
  }
}
