export interface ErrorLocation {
  /** Source file (or config file) the problem belongs to. */
  file?: string;
  /** 1-based line of the block's opening fence. */
  blockLine?: number;
  /** 1-based step number within the block. */
  step?: number;
  /** Target description or URL the step acts on. */
  target?: string;
}

/** An error a user can act on: says where it happened and why. */
export class ShotdocError extends Error {
  readonly reason: string;
  readonly location: ErrorLocation;

  constructor(reason: string, location: ErrorLocation = {}) {
    super(formatError(reason, location));
    this.name = 'ShotdocError';
    this.reason = reason;
    this.location = location;
  }

  /** Same reason with extra location fields filled in (existing fields win). */
  withLocation(extra: ErrorLocation): ShotdocError {
    return new ShotdocError(this.reason, { ...extra, ...definedOnly(this.location) });
  }
}

function definedOnly(l: ErrorLocation): ErrorLocation {
  return Object.fromEntries(Object.entries(l).filter(([, v]) => v !== undefined));
}

export function formatError(reason: string, loc: ErrorLocation = {}): string {
  let where = loc.file ?? '';
  if (loc.blockLine !== undefined) where += `${where ? ':' : 'line '}${loc.blockLine}`;
  const detail: string[] = [];
  if (loc.step !== undefined) detail.push(`step ${loc.step}`);
  if (loc.target !== undefined) detail.push(loc.target);
  const tail = detail.length ? ` (${detail.join(', ')})` : '';
  return `${where}${tail}${where || tail ? ': ' : ''}${reason}`;
}

/** Several validation problems reported together. */
export class ShotdocErrors extends Error {
  readonly errors: ShotdocError[];
  constructor(errors: ShotdocError[]) {
    super(errors.map((e) => e.message).join('\n'));
    this.name = 'ShotdocErrors';
    this.errors = errors;
  }
}
