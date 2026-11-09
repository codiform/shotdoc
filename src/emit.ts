import type { Block } from './parse/types.js';
import type { Shot } from './run/steps.js';

const escapeAlt = (s: string) => s.replace(/[\\[\]]/g, '\\$&');

/**
 * Builds the output document by replacing each block's line range with image references.
 * Everything outside the blocks is copied byte for byte, including line endings.
 * `imageRef` maps a screenshot name to the path written in the document.
 */
export function buildDocument(
  source: string,
  blocks: Block[],
  shots: Map<number, Shot[]>,
  imageRef: (name: string) => string,
): string {
  const lines = source.split(/(?<=\n)/);
  let out = '';
  let next = 0;
  for (const block of [...blocks].sort((a, b) => a.startLine - b.startLine)) {
    out += lines.slice(next, block.startLine).join('');
    const replaced = lines.slice(block.startLine, block.endLine);
    const last = replaced[replaced.length - 1] ?? '';
    const eol = last.endsWith('\r\n') ? '\r\n' : '\n';
    const refs = (shots.get(block.line) ?? []).map((s) => `![${escapeAlt(s.alt ?? s.name)}](${imageRef(s.name)})`);
    if (refs.length) {
      let text = refs.join(eol + eol) + eol;
      if (!/\n$/.test(last)) text = text.slice(0, -eol.length); // block ended the file without a newline
      out += text;
    }
    next = block.endLine;
  }
  return out + lines.slice(next).join('');
}
