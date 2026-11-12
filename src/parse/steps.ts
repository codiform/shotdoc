import { parse } from 'yaml';
import { type ErrorLocation, ShotdocError } from '../errors.js';
import { isAbsoluteUrl } from '../url.js';
import { describeTarget, type Step, type Target, type WaitCondition } from './types.js';

export interface StepContext {
  file: string;
  blockLine: number;
  baseUrl?: string;
}

const STEP_NAMES = ['goto', 'click', 'dblclick', 'hover', 'unhover', 'fill', 'press', 'wait', 'screenshot'];
const NAME_RE = /^[A-Za-z0-9_-]+$/;
const isMap = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

class StepError extends Error {}
const bad = (msg: string): never => {
  throw new StepError(msg);
};

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
  for (const k of Object.keys(v))
    if (k !== 'key' && k !== 'target') bad(`press has unknown key \`${k}\` (allowed: key, target)`);
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

function parseScreenshot(v: unknown): Omit<Extract<Step, { kind: 'screenshot' }>, 'n' | 'kind'> {
  if (!isMap(v)) return bad('screenshot needs a mapping with at least `name`');

  for (const k of Object.keys(v)) {
    if (!['name', 'target', 'include', 'padding', 'alt'].includes(k)) {
      bad(`screenshot has unknown key \`${k}\` (allowed: name, target, include, padding, alt)`);
    }
  }

  if (v.name === undefined) bad('screenshot requires a `name`');

  if (typeof v.name !== 'string' || !NAME_RE.test(v.name)) {
    bad(`screenshot name ${JSON.stringify(v.name)} is invalid: use only letters, digits, hyphens, and underscores`);
  }

  const out: Omit<Extract<Step, { kind: 'screenshot' }>, 'n' | 'kind'> = { name: v.name as string, include: [] };
  if (v.target !== undefined) out.target = parseTarget(v.target);

  if (v.include !== undefined) {
    if (!Array.isArray(v.include)) bad('screenshot `include` must be a list of targets');
    if (out.target === undefined) bad('screenshot `include` requires a `target`');
    out.include = (v.include as unknown[]).map((t, i) => parseTarget(t, `include[${i + 1}]`));
  }

  if (v.padding !== undefined) {
    if (typeof v.padding !== 'number' || !(v.padding >= 0)) bad('screenshot `padding` must be a non-negative number');
    out.padding = v.padding as number;
  }

  if (v.alt !== undefined) {
    if (typeof v.alt !== 'string') bad('screenshot `alt` must be a string');
    out.alt = v.alt as string;
  }
  return out;
}

function parseStep(name: string, v: unknown, n: number, ctx: StepContext): Step {
  switch (name) {
    case 'goto': {
      if (typeof v !== 'string' || !v.trim()) return bad('goto needs a URL string');
      if (!isAbsoluteUrl(v) && !ctx.baseUrl) {
        bad(
          `goto uses the relative URL \`${v}\` but no base URL is configured: set \`baseUrl\` in shotdoc.config.yaml or use an absolute URL`,
        );
      }
      return { n, kind: 'goto', url: v };
    }
    case 'click':
    case 'dblclick':
    case 'hover':
      return { n, kind: name, target: parseTarget(v) };
    case 'unhover':
      if (v !== null && v !== undefined) bad('unhover takes no value: write `- unhover:` with nothing after the colon');
      return { n, kind: 'unhover' };
    case 'fill': {
      if (!isMap(v)) return bad('fill needs a mapping with `target` and `value`');
      for (const k of Object.keys(v)) if (k !== 'target' && k !== 'value') bad(`fill has unknown key \`${k}\``);
      if (v.target === undefined) bad('fill requires a `target`');
      if (v.value === undefined) bad('fill requires a `value`');
      if (typeof v.value !== 'string' && typeof v.value !== 'number') bad('fill `value` must be text');
      return { n, kind: 'fill', target: parseTarget(v.target), value: String(v.value) };
    }
    case 'press':
      return { n, kind: 'press', ...parsePress(v) };
    case 'wait':
      return { n, kind: 'wait', condition: parseWait(v) };
    default:
      return { n, kind: 'screenshot', ...parseScreenshot(v) };
  }
}

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
      steps.push(parseStep(name, item[name], n, ctx));
    } catch (e) {
      if (!(e instanceof StepError)) throw e;
      errors.push(new ShotdocError(e.message, loc({ step: n })));
    }
  });
  return { steps, errors };
}

export { describeTarget };
