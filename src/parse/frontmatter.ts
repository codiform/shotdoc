import { isScalar, isMap as isYamlMap, parse, parseDocument } from 'yaml';
import { ShotdocError } from '../errors.js';
import { asList, isMap, nonEmptyString, parseTargets, rejectUnknownKeys, StepError } from './steps.js';
import { type Defaults, NO_DEFAULTS } from './types.js';

/** A first line of `---`, then (optionally) a body, then a closing `---` or `...` line. */
const FRONT_MATTER = /^﻿?---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/;

const SHOTDOC_KEYS = ['defaults'];
const DEFAULTS_KEYS = ['hide', 'mask', 'maskColor'];

/**
 * Reads the document's front matter and returns the defaults in its `shotdoc.defaults`. Only the
 * `shotdoc` key is read: every other key belongs to someone else and is ignored. The source itself
 * is never changed, so block line numbers still count the front matter's lines.
 */
export function readFrontMatter(source: string, file: string): { defaults: Defaults; errors: ShotdocError[] } {
  const found = FRONT_MATTER.exec(source);
  if (!found) {
    return { defaults: NO_DEFAULTS, errors: [] };
  }

  const fail = (reason: string) => ({ defaults: NO_DEFAULTS, errors: [new ShotdocError(reason, { file })] });
  let doc: unknown;
  try {
    doc = parse(found[1] ?? '');
  } catch (e) {
    return fail(`the front matter is not valid YAML: ${(e as Error).message.split('\n')[0]}`);
  }
  if (!isMap(doc) || doc.shotdoc === undefined) {
    return { defaults: NO_DEFAULTS, errors: [] };
  }

  const errors: ShotdocError[] = [];
  const attempt = <T>(fn: () => T): T | undefined => {
    try {
      return fn();
    } catch (e) {
      if (!(e instanceof StepError)) {
        throw e;
      }
      errors.push(new ShotdocError(e.message, { file }));
      return undefined;
    }
  };

  const defaults: Defaults = { hide: [], mask: [] };
  attempt(() => {
    if (!isMap(doc.shotdoc)) {
      throw new StepError('the front matter `shotdoc` must be a mapping');
    }
    rejectUnknownKeys(doc.shotdoc, SHOTDOC_KEYS, 'the front matter `shotdoc`');
    const raw = doc.shotdoc.defaults;
    if (raw === undefined) {
      return;
    }
    if (!isMap(raw)) {
      throw new StepError('`shotdoc.defaults` must be a mapping');
    }
    if ('annotate' in raw) {
      const reason = '`shotdoc.defaults` does not take `annotate`: annotations are set on each screenshot';
      errors.push(new ShotdocError(reason, { file }));
    }
    attempt(() =>
      rejectUnknownKeys(
        Object.fromEntries(Object.entries(raw).filter(([k]) => k !== 'annotate')),
        DEFAULTS_KEYS,
        '`shotdoc.defaults`',
      ),
    );
    for (const key of ['hide', 'mask'] as const) {
      if (raw[key] === undefined) {
        continue;
      }
      const targets = attempt(() =>
        parseTargets(asList(raw[key], `\`shotdoc.defaults.${key}\``, 'targets'), `shotdoc.defaults.${key}`),
      );
      if (targets) {
        defaults[key] = targets;
      }
    }
    if (raw.maskColor !== undefined) {
      const colour = attempt(() => nonEmptyString(raw.maskColor, '`shotdoc.defaults.maskColor`'));
      if (colour !== undefined) {
        defaults.maskColor = colour;
      }
    }
  });
  return { defaults, errors };
}

/**
 * Removes the `shotdoc` key from the document's front matter, for the built output. The key is cut
 * out by its source range, never re-serialised, so every other key stays exactly as written. When
 * `shotdoc` is the only key the whole block goes, with one blank line after it. Text without front
 * matter, without a `shotdoc` key, or whose front matter is not a mapping comes back unchanged.
 */
export function stripShotdocKey(text: string): string {
  const found = FRONT_MATTER.exec(text);
  if (!found) {
    return text;
  }
  const body = found[1] ?? '';
  const bodyStart = text.indexOf('\n') + 1;
  const doc = parseDocument(body);
  if (doc.errors.length || !isYamlMap(doc.contents)) {
    return text;
  }
  const items = doc.contents.items;
  const pair = items.find((p) => isScalar(p.key) && p.key.value === 'shotdoc');
  if (!pair || !isScalar(pair.key) || !pair.key.range) {
    return text;
  }

  if (items.length === 1) {
    const rest = text.slice(found[0].length);
    const blank = /^[ \t]*\r?\n/.exec(rest);
    return text.slice(0, text.startsWith('\uFEFF') ? 1 : 0) + rest.slice(blank ? blank[0].length : 0);
  }

  const valueRange = (pair.value as { range?: [number, number, number] } | null)?.range;
  let end = valueRange ? valueRange[1] : pair.key.range[1];
  if (body[end - 1] !== '\n') {
    const eol = body.indexOf('\n', end);
    end = eol === -1 ? body.length : eol + 1;
  }
  let start = pair.key.range[0];
  start = body.lastIndexOf('\n', start - 1) + 1;
  const cut = body.slice(0, start) + body.slice(end);
  // The newline before the closing line is outside the body: when the cut reaches the body's end it goes too.
  const tail = text.slice(bodyStart + body.length);
  return text.slice(0, bodyStart) + cut + (end === body.length ? tail.replace(/^\r?\n/, '') : tail);
}
