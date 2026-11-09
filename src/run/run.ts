import type { Config } from '../config.js';
import type { Block } from '../parse/types.js';
import { Session } from './session.js';
import { runBlock, type Shot } from './steps.js';

/**
 * Runs all blocks in order in one fresh session and returns each block's screenshots
 * (keyed by the block's opening-fence line). The browser is always closed.
 */
export async function runDocument(
  blocks: Block[],
  opts: { config: Config; file: string; stageDir: string },
): Promise<Map<number, Shot[]>> {
  const session = await Session.start(opts.config);
  const out = new Map<number, Shot[]>();
  try {
    for (const block of blocks) {
      out.set(block.line, await runBlock(block, { session, file: opts.file, stageDir: opts.stageDir }));
    }
  } finally {
    await session.close();
  }
  return out;
}
