import { ShotdocError, ShotdocErrors } from '../errors.js';
import { findBlocks } from './blocks.js';
import { parseSteps } from './steps.js';
import type { Block } from './types.js';

/**
 * Parses and validates every shotdoc block in a document, reporting every problem.
 * Throws ShotdocErrors if anything is invalid; no browser is involved.
 */
export function parseDocument(source: string, file: string, opts: { baseUrl?: string } = {}): Block[] {
  const { blocks: raw, errors } = findBlocks(source, file);
  const blocks: Block[] = [];
  const seen = new Map<string, number>();
  for (const r of raw) {
    const { steps, errors: stepErrors } = parseSteps(r.body, { file, blockLine: r.line, baseUrl: opts.baseUrl });
    errors.push(...stepErrors);
    for (const s of steps) {
      if (s.kind !== 'screenshot') continue;
      const firstLine = seen.get(s.name);
      if (firstLine !== undefined) {
        errors.push(
          new ShotdocError(
            `screenshot name \`${s.name}\` is already used by the block at line ${firstLine}; names must be unique within a document`,
            { file, blockLine: r.line, step: s.n },
          ),
        );
      } else {
        seen.set(s.name, r.line);
      }
    }
    blocks.push({ line: r.line, startLine: r.startLine, endLine: r.endLine, steps });
  }
  if (errors.length) {
    errors.sort((a, b) => (a.location.blockLine ?? 0) - (b.location.blockLine ?? 0) || (a.location.step ?? 0) - (b.location.step ?? 0));
    throw new ShotdocErrors(errors);
  }
  return blocks;
}
