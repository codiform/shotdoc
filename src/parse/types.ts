export type Target =
  | { kind: 'css'; selector: string }
  | { kind: 'role'; role: string; name?: string }
  | { kind: 'text'; text: string }
  | { kind: 'label'; label: string };

export type WaitCondition =
  | { kind: 'visible'; target: Target }
  | { kind: 'hidden'; target: Target }
  | { kind: 'text'; text: string }
  | { kind: 'network' }
  | { kind: 'ms'; ms: number };

interface Base {
  /** 1-based position within the block. */
  n: number;
}

export type Step =
  | (Base & { kind: 'goto'; url: string })
  | (Base & { kind: 'click'; target: Target })
  | (Base & { kind: 'dblclick'; target: Target })
  | (Base & { kind: 'hover'; target: Target })
  | (Base & { kind: 'unhover' })
  | (Base & { kind: 'fill'; target: Target; value: string })
  | (Base & { kind: 'press'; key: string; target?: Target })
  | (Base & { kind: 'wait'; condition: WaitCondition })
  | (Base & {
      kind: 'screenshot';
      name: string;
      target?: Target;
      include: Target[];
      padding?: number;
      alt?: string;
    });

export interface Block {
  /** 1-based line of the opening fence. */
  line: number;
  /** 0-based first line of the block in the source. */
  startLine: number;
  /** 0-based line after the closing fence. */
  endLine: number;
  steps: Step[];
}

export function describeTarget(t: Target): string {
  switch (t.kind) {
    case 'css':
      return `css=${t.selector}`;
    case 'role':
      return t.name !== undefined ? `role=${t.role} name="${t.name}"` : `role=${t.role}`;
    case 'text':
      return `text="${t.text}"`;
    case 'label':
      return `label="${t.label}"`;
  }
}
