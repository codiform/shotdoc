import { parse } from 'yaml';
import { type ErrorLocation, ShotdocError } from '../errors.js';
import { isAbsoluteUrl } from '../url.js';
import {
  ANNOTATION_KINDS,
  type Annotation,
  type AnnotationKind,
  ARROW_SIDES,
  type ArrowSide,
  type Defaults,
  NO_DEFAULTS,
  type Step,
  type Target,
  type WaitCondition,
} from './types.js';

export interface StepContext {
  file: string;
  blockLine: number;
  baseUrl?: string;
  /** The document's front-matter defaults, given to every screenshot that has not opted out. */
  defaults?: Defaults;
}

const SCREENSHOT_KEYS = [
  'name',
  'target',
  'include',
  'hide',
  'mask',
  'maskColor',
  'annotate',
  'defaults',
  'padding',
  'alt',
];
const NAME_RE = /^[A-Za-z0-9_-]+$/;
export const isMap = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export class StepError extends Error {}

const bad = (msg: string): never => {
  throw new StepError(msg);
};

/** Rejects any key of `v` that is not in `allowed`, naming it and listing what is allowed. */
export function rejectUnknownKeys(v: Record<string, unknown>, allowed: readonly string[], what: string): void {
  for (const k of Object.keys(v)) {
    if (!allowed.includes(k)) bad(`${what} has unknown key \`${k}\` (allowed: ${allowed.join(', ')})`);
  }
}

/** `what` must be a list; `noun` completes the message ("a list of targets"). */
export function asList(v: unknown, what: string, noun: string): unknown[] {
  if (!Array.isArray(v)) bad(`${what} must be a list of ${noun}`);
  return v as unknown[];
}

/** Parses a list of targets, naming a bad item as `key[n]`. */
export const parseTargets = (list: unknown[], key: string): Target[] =>
  list.map((t, i) => parseTarget(t, `${key}[${i + 1}]`));

export function nonEmptyString(v: unknown, what: string): string {
  if (typeof v !== 'string' || !v.trim()) bad(`${what} must be a non-empty string`);
  return v as string;
}

function plainString(v: unknown, what: string): string {
  if (typeof v !== 'string') bad(`${what} must be a string`);
  return v as string;
}

function nonNegativeNumber(v: unknown, what: string): number {
  if (typeof v !== 'number' || !(v >= 0)) bad(`${what} must be a non-negative number`);
  return v as number;
}

/** Parses a target; throws StepError (message only) when invalid. */
export function parseTarget(v: unknown, what = 'target'): Target {
  if (typeof v === 'string') {
    if (!v.trim()) bad(`${what} must not be empty`);
    return { kind: 'css', selector: v };
  }

  if (!isMap(v)) return bad(`${what} must be a selector string or a mapping with role, text, or label`);

  const keys = Object.keys(v);
  const primary = keys.filter((k) => k === 'role' || k === 'text' || k === 'label');

  if (primary.length !== 1) {
    return bad(`${what} mapping needs exactly one of \`role\`, \`text\`, or \`label\``);
  }

  const key = primary[0];
  for (const k of keys) {
    if (k !== key && !(key === 'role' && k === 'name')) bad(`${what} has unexpected key \`${k}\``);
  }

  const str = (x: unknown, name: string): string => {
    if (typeof x !== 'string' || !x) bad(`${what} \`${name}\` must be a non-empty string`);
    return x as string;
  };

  if (key === 'role') {
    return v.name === undefined
      ? { kind: 'role', role: str(v.role, 'role') }
      : { kind: 'role', role: str(v.role, 'role'), name: str(v.name, 'name') };
  }

  if (key === 'text') return { kind: 'text', text: str(v.text, 'text') };

  return { kind: 'label', label: str(v.label, 'label') };
}

/** Modifiers joined by `+`, then a final key that is a single character or a name. */
const KEY_RE = /^(?:[A-Za-z]+\+)*(?:\S|[A-Za-z][A-Za-z0-9]*)$/;

function parseKey(v: unknown): string {
  if (typeof v === 'number' || typeof v === 'boolean') {
    return bad(`press key ${String(v)} is not text: put it in quotes, for example press: "${String(v)}"`);
  }

  if (typeof v !== 'string' || !v) return bad('press needs a key, such as Enter or Control+A');

  if (!KEY_RE.test(v)) {
    return bad(
      `press key ${JSON.stringify(v)} is not valid: write a key name or a single character, optionally with modifiers joined by +, such as Enter or Control+A`,
    );
  }

  return v;
}

function parsePress(v: unknown): { key: string; target?: Target } {
  if (!isMap(v)) return { key: parseKey(v) };
  rejectUnknownKeys(v, ['key', 'target'], 'press');
  if (v.key === undefined) bad('press requires a `key`');
  const key = parseKey(v.key);
  return v.target === undefined ? { key } : { key, target: parseTarget(v.target) };
}

function parseWait(v: unknown): WaitCondition {
  if (typeof v === 'number') {
    if (!Number.isFinite(v) || v < 0) bad('wait milliseconds must be a non-negative number');
    return { kind: 'ms', ms: v };
  }
  if (!isMap(v)) return bad('wait needs one condition: visible, hidden, text, network, or a number of milliseconds');
  const keys = Object.keys(v);
  if (keys.length !== 1) bad('wait takes exactly one condition: visible, hidden, text, network, or milliseconds');
  const key = keys[0];
  const val = v[key as string];
  switch (key) {
    case 'visible':
    case 'hidden':
      return { kind: key, target: parseTarget(val, `\`${key}\` target`) };
    case 'text':
      if (typeof val !== 'string' || !val) bad('wait `text` must be a non-empty string');
      return { kind: 'text', text: val as string };
    case 'network':
      if (val !== 'idle') bad('wait `network` only supports the value `idle`');
      return { kind: 'network' };
    default:
      return bad(`unsupported wait condition \`${key}\` (use visible, hidden, text, network, or milliseconds)`);
  }
}

/**
 * One `annotate` item: a mapping with a single key naming the kind. Its value is a target, or a
 * mapping with `target` and options (a target mapping never has a `target` key, so that is
 * unambiguous).
 */
function parseAnnotation(v: unknown, i: number): Annotation {
  const at = `annotate[${i}]`;
  const kinds = ANNOTATION_KINDS.join(', ');
  if (!isMap(v)) return bad(`${at} must be a mapping with one key: ${kinds}`);
  const keys = Object.keys(v);
  if (keys.length !== 1) bad(`${at} needs exactly one key naming the kind (${kinds}), found ${keys.length}`);
  const kind = keys[0] as string;
  if (!(ANNOTATION_KINDS as readonly string[]).includes(kind)) {
    bad(`${at} has unknown kind \`${kind}\` (use ${kinds})`);
  }
  const what = `${at} (${kind})`;
  const value = v[kind];

  if (!isMap(value) || value.target === undefined) {
    return { kind: kind as AnnotationKind, target: parseTarget(value, `${what} target`) };
  }

  rejectUnknownKeys(value, kind === 'arrow' ? ['target', 'color', 'from'] : ['target', 'color'], what);
  const out: Annotation = { kind: kind as AnnotationKind, target: parseTarget(value.target, `${what} target`) };
  if (value.color !== undefined) out.color = nonEmptyString(value.color, `${what} \`color\``);
  if (value.from !== undefined) {
    if (!(ARROW_SIDES as readonly unknown[]).includes(value.from)) {
      bad(`${what} \`from\` must be one of ${ARROW_SIDES.join(', ')}`);
    }
    out.from = value.from as ArrowSide;
  }
  return out;
}

type ScreenshotFields = Omit<Extract<Step, { kind: 'screenshot' }>, 'n' | 'kind'>;

function parseScreenshotName(v: Record<string, unknown>): string {
  if (v.name === undefined) bad('screenshot requires a `name`');
  if (typeof v.name !== 'string' || !NAME_RE.test(v.name)) {
    bad(`screenshot name ${JSON.stringify(v.name)} is invalid: use only letters, digits, hyphens, and underscores`);
  }
  return v.name as string;
}

function parseScreenshot(v: unknown, ctx: StepContext): ScreenshotFields {
  if (!isMap(v)) return bad('screenshot needs a mapping with at least `name`');
  rejectUnknownKeys(v, SCREENSHOT_KEYS, 'screenshot');

  const out: ScreenshotFields = {
    name: parseScreenshotName(v),
    include: [],
    hide: [],
    mask: [],
    annotate: [],
    defaults: ctx.defaults ?? NO_DEFAULTS,
  };
  if (v.target !== undefined) out.target = parseTarget(v.target);

  if (v.include !== undefined) {
    const list = asList(v.include, 'screenshot `include`', 'targets');
    if (out.target === undefined) bad('screenshot `include` requires a `target`');
    out.include = parseTargets(list, 'include');
  }
  for (const key of ['hide', 'mask'] as const) {
    if (v[key] !== undefined) out[key] = parseTargets(asList(v[key], `screenshot \`${key}\``, 'targets'), key);
  }
  if (v.maskColor !== undefined) out.maskColor = nonEmptyString(v.maskColor, 'screenshot `maskColor`');
  if (v.annotate !== undefined) {
    const list = asList(v.annotate, 'screenshot `annotate`', 'annotations');
    if (out.target === undefined) bad('screenshot `annotate` requires a `target`');
    out.annotate = list.map((a, i) => parseAnnotation(a, i + 1));
  }
  if (v.defaults !== undefined) {
    if (typeof v.defaults !== 'boolean') bad('screenshot `defaults` must be true or false');
    if (v.defaults === false) out.defaults = NO_DEFAULTS;
  }
  if (v.padding !== undefined) out.padding = nonNegativeNumber(v.padding, 'screenshot `padding`');
  if (v.alt !== undefined) out.alt = plainString(v.alt, 'screenshot `alt`');
  return out;
}

type StepParser = (v: unknown, n: number, ctx: StepContext) => Step;

function parseGoto(v: unknown, n: number, ctx: StepContext): Step {
  if (typeof v !== 'string' || !v.trim()) return bad('goto needs a URL string');
  if (!isAbsoluteUrl(v) && !ctx.baseUrl) {
    bad(
      `goto uses the relative URL \`${v}\` but no base URL is configured: set \`baseUrl\` in shotdoc.config.yaml or use an absolute URL`,
    );
  }
  return { n, kind: 'goto', url: v };
}

/** `click`, `dblclick` and `hover` all take just a target. */
const parseTargetStep =
  (kind: 'click' | 'dblclick' | 'hover'): StepParser =>
  (v, n) => ({ n, kind, target: parseTarget(v) });

function parseUnhover(v: unknown, n: number): Step {
  if (v !== null && v !== undefined) bad('unhover takes no value: write `- unhover:` with nothing after the colon');
  return { n, kind: 'unhover' };
}

function parseFill(v: unknown, n: number): Step {
  if (!isMap(v)) return bad('fill needs a mapping with `target` and `value`');
  rejectUnknownKeys(v, ['target', 'value'], 'fill');
  if (v.target === undefined) bad('fill requires a `target`');
  if (v.value === undefined) bad('fill requires a `value`');
  if (typeof v.value !== 'string' && typeof v.value !== 'number') bad('fill `value` must be text');
  return { n, kind: 'fill', target: parseTarget(v.target), value: String(v.value) };
}

/** One parser per step name, in the order the names are listed to authors. */
const PARSERS: Record<string, StepParser> = {
  goto: parseGoto,
  click: parseTargetStep('click'),
  dblclick: parseTargetStep('dblclick'),
  hover: parseTargetStep('hover'),
  unhover: parseUnhover,
  fill: parseFill,
  press: (v, n) => ({ n, kind: 'press', ...parsePress(v) }),
  wait: (v, n) => ({ n, kind: 'wait', condition: parseWait(v) }),
  screenshot: (v, n, ctx) => ({ n, kind: 'screenshot', ...parseScreenshot(v, ctx) }),
};
const STEP_NAMES = Object.keys(PARSERS);

/** Parses and validates one block body. Reports every problem in the block. */
export function parseSteps(body: string, ctx: StepContext): { steps: Step[]; errors: ShotdocError[] } {
  const loc = (extra: ErrorLocation = {}): ErrorLocation => ({ file: ctx.file, blockLine: ctx.blockLine, ...extra });
  let doc: unknown;
  try {
    doc = parse(body);
  } catch (e) {
    const first = (e as Error).message.split('\n')[0];
    return { steps: [], errors: [new ShotdocError(`invalid YAML: ${first}`, loc())] };
  }
  if (!Array.isArray(doc)) {
    return {
      steps: [],
      errors: [
        new ShotdocError('a shotdoc block must contain a YAML list of steps, each written as `- step: ...`', loc()),
      ],
    };
  }
  const steps: Step[] = [];
  const errors: ShotdocError[] = [];
  doc.forEach((item: unknown, i) => {
    const n = i + 1;
    if (!isMap(item) || Object.keys(item).length !== 1) {
      errors.push(
        new ShotdocError('each step must be a mapping with exactly one key, such as `- click: ...`', loc({ step: n })),
      );
      return;
    }

    const name = Object.keys(item)[0] as string;
    if (!STEP_NAMES.includes(name)) {
      errors.push(
        new ShotdocError(`unsupported step \`${name}\` (supported: ${STEP_NAMES.join(', ')})`, loc({ step: n })),
      );
      return;
    }

    try {
      steps.push(PARSERS[name]!(item[name], n, ctx));
    } catch (e) {
      if (!(e instanceof StepError)) {
        throw e;
      }
      errors.push(new ShotdocError(e.message, loc({ step: n })));
    }
  });
  return { steps, errors };
}

export { describeTarget } from './types.js';
