import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { parse } from 'yaml';
import { ShotdocError } from './errors.js';
import { isMap, nonEmptyString, parseTarget, rejectUnknownKeys, StepError } from './parse/steps.js';
import type { WaitCondition } from './parse/types.js';
import { isAbsoluteUrl, resolveGoto } from './url.js';

export const CONFIG_FILE = 'shotdoc.config.yaml';

/** The default place for a saved login, beside the configuration file. */
export const DEFAULT_AUTH_STATE = '.shotdoc/auth.json';

/** A login by hand, saved by `shotdoc login` and checked before every build. */
export interface Auth {
  /** Absolute URL where the login starts. */
  url: string;
  /** What proves the session is logged in: a page to load and one positive condition on it. */
  check: { url: string; condition: Extract<WaitCondition, { kind: 'visible' | 'text' }> };
  /** Absolute path of the saved session file. */
  state: string;
  /** The configuration file's name, for messages. */
  configName: string;
}

export interface Config {
  baseUrl?: string;
  /** Absolute output directory. */
  outDir: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  auth?: Auth;
}

const KEYS = ['baseUrl', 'outDir', 'viewport', 'deviceScaleFactor', 'auth'];
const AUTH_KEYS = ['url', 'check', 'state'];
const CHECK_KEYS = ['url', 'visible', 'text'];

/**
 * Chooses the configuration file: the one named with `--config`, otherwise the nearest
 * `shotdoc.config.yaml` from the source file's directory upward, otherwise the working
 * directory's. Returns undefined when there is none.
 */
export function findConfig(source: string, cwd: string, explicit?: string): string | undefined {
  if (explicit !== undefined) {
    const path = resolve(cwd, explicit);
    if (!existsSync(path) || !statSync(path).isFile()) {
      throw new ShotdocError(`configuration file not found: ${explicit}`);
    }
    return path;
  }
  let dir = dirname(resolve(cwd, source));
  for (;;) {
    const candidate = join(dir, CONFIG_FILE);
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  const fallback = join(cwd, CONFIG_FILE);
  return existsSync(fallback) ? fallback : undefined;
}

/**
 * Reads and validates a configuration file (none means all defaults). A relative `outDir`
 * resolves against the file's directory, or against `cwd` when there is no file.
 */
export function loadConfig(file: string | undefined, cwd: string = process.cwd()): Config {
  const name = file === undefined ? CONFIG_FILE : relative(cwd, file) || CONFIG_FILE;
  const base = file === undefined ? cwd : dirname(file);
  let raw: unknown = {};
  if (file !== undefined) {
    let text: string;
    try {
      text = readFileSync(file, 'utf8');
    } catch (e) {
      throw new ShotdocError(`cannot read the configuration file: ${(e as Error).message}`, { file: name });
    }
    try {
      raw = parse(text) ?? {};
    } catch (e) {
      throw new ShotdocError(`invalid YAML: ${(e as Error).message}`, { file: name });
    }
  }
  const fail = (reason: string) => new ShotdocError(reason, { file: name });
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw fail('must be a mapping of settings');
  }
  const obj = raw as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (!KEYS.includes(key)) {
      throw fail(`unknown configuration key \`${key}\` (known keys: ${KEYS.join(', ')})`);
    }
  }

  const config: Config = {
    outDir: resolve(base, 'build'),
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  };

  if (obj.baseUrl !== undefined) {
    if (typeof obj.baseUrl !== 'string') {
      throw fail('`baseUrl` must be a string');
    }
    try {
      new URL(obj.baseUrl);
    } catch {
      throw fail(`\`baseUrl\` is not a valid absolute URL: ${obj.baseUrl}`);
    }
    config.baseUrl = obj.baseUrl;
  }
  if (obj.outDir !== undefined) {
    if (typeof obj.outDir !== 'string' || !obj.outDir) {
      throw fail('`outDir` must be a non-empty string');
    }
    config.outDir = resolve(base, obj.outDir);
  }
  if (obj.viewport !== undefined) {
    const v = obj.viewport as Record<string, unknown> | null;
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw fail('`viewport` must be a mapping with `width` and `height`');
    }
    for (const k of Object.keys(v)) {
      if (k !== 'width' && k !== 'height') {
        throw fail(`unknown configuration key \`viewport.${k}\``);
      }
    }
    for (const k of ['width', 'height'] as const) {
      const val = v[k] ?? config.viewport[k];
      if (typeof val !== 'number' || !Number.isInteger(val) || val <= 0) {
        throw fail(`\`viewport.${k}\` must be a positive whole number`);
      }
      config.viewport[k] = val;
    }
  }
  if (obj.deviceScaleFactor !== undefined) {
    const s = obj.deviceScaleFactor;
    if (typeof s !== 'number' || !(s > 0)) {
      throw fail('`deviceScaleFactor` must be a positive number');
    }
    config.deviceScaleFactor = s;
  }
  if (obj.auth !== undefined) {
    config.auth = parseAuth(obj.auth, base, name, config.baseUrl, fail);
  }
  return config;
}

function parseAuth(
  raw: unknown,
  base: string,
  configName: string,
  baseUrl: string | undefined,
  fail: (reason: string) => ShotdocError,
): Auth {
  const url = (value: unknown, what: string): string => {
    if (typeof value !== 'string' || !value.trim()) {
      throw fail(`\`${what}\` must be a non-empty string`);
    }
    if (!isAbsoluteUrl(value) && !baseUrl) {
      throw fail(`\`${what}\` is a relative URL (${value}): set \`baseUrl\` or give an absolute URL`);
    }
    return resolveGoto(value, baseUrl);
  };
  const guard = <T>(fn: () => T): T => {
    try {
      return fn();
    } catch (e) {
      if (e instanceof StepError) {
        throw fail(e.message);
      }
      throw e;
    }
  };

  if (!isMap(raw)) {
    throw fail('`auth` must be a mapping with `url` and `check`');
  }
  guard(() => rejectUnknownKeys(raw, AUTH_KEYS, '`auth`'));
  if (raw.url === undefined) {
    throw fail('`auth` needs a `url`: the page where the login starts');
  }
  const loginUrl = url(raw.url, 'auth.url');

  if (raw.check === undefined) {
    throw fail('`auth` needs a `check`: a `visible` target or `text` that appears only when logged in');
  }
  const check = raw.check;
  if (!isMap(check)) {
    throw fail('`auth.check` must be a mapping with `visible` or `text`');
  }
  guard(() => rejectUnknownKeys(check, CHECK_KEYS, '`auth.check`'));
  const conditions = ['visible', 'text'].filter((k) => check[k] !== undefined);
  if (conditions.length !== 1) {
    throw fail('`auth.check` needs exactly one of `visible` or `text`, to appear only when logged in');
  }
  const checkUrl = check.url === undefined ? loginUrl : url(check.url, 'auth.check.url');
  const condition: Auth['check']['condition'] = guard(() =>
    check.visible !== undefined
      ? { kind: 'visible', target: parseTarget(check.visible, '`auth.check.visible`') }
      : { kind: 'text', text: nonEmptyString(check.text, '`auth.check.text`') },
  );

  if (raw.state !== undefined && (typeof raw.state !== 'string' || !raw.state.trim())) {
    throw fail('`auth.state` must be a non-empty file path');
  }
  const state = resolve(base, (raw.state as string | undefined) ?? DEFAULT_AUTH_STATE);
  return { url: loginUrl, check: { url: checkUrl, condition }, state, configName };
}
