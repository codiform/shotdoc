import MarkdownIt from 'markdown-it';
import { ShotdocError } from '../errors.js';

export interface RawBlock {
  /** 1-based line of the opening fence. */
  line: number;
  startLine: number;
  endLine: number;
  body: string;
}

const md = new MarkdownIt('commonmark');

/** Attributes that are reserved for later changes. */
function isReserved(attr: string): boolean {
  return attr === 'js' || /^(state|save)=/.test(attr);
}

/**
 * Finds shotdoc fences in a Markdown source. Non-shotdoc fences are ignored.
 * Problems with the fence itself (nesting, attributes) are returned as errors.
 */
export function findBlocks(source: string, file: string): { blocks: RawBlock[]; errors: ShotdocError[] } {
  const blocks: RawBlock[] = [];
  const errors: ShotdocError[] = [];

  for (const token of md.parse(source, {})) {
    if (token.type !== 'fence' || !token.map) continue;

    const [first, ...attrs] = token.info.trim().split(/\s+/);
    if (first !== 'shotdoc') continue;

    const [start, end] = token.map;
    const line = start + 1;

    let ok = true;

    if (token.level > 0) {
      errors.push(
        new ShotdocError('shotdoc blocks must be at the top level of the document, not inside a list or blockquote', {
          file,
          blockLine: line,
        }),
      );
      ok = false;
    }

    for (const attr of attrs) {
      ok = false;
      errors.push(
        new ShotdocError(
          isReserved(attr) ? `attribute \`${attr}\` is not supported yet` : `unknown attribute \`${attr}\``,
          { file, blockLine: line },
        ),
      );
    }

    if (ok) blocks.push({ line, startLine: start, endLine: end, body: token.content });
  }

  return { blocks, errors };
}
