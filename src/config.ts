import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { ShotdocError } from './errors.js';

export const CONFIG_FILE = 'shotdoc.config.yaml';

export interface Config {
  baseUrl?: string;
  /** Absolute output directory. */
  outDir: string;
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
}

const KEYS = ['baseUrl', 'outDir', 'viewport', 'deviceScaleFactor'];

export function loadConfig(cwd: string): Config {
  const path = join(cwd, CONFIG_FILE);
  let raw: unknown = {};
  if (existsSync(path)) {
    try {
      raw = parse(readFileSync(path, 'utf8')) ?? {};
    } catch (e) {
      throw new ShotdocError(`invalid YAML: ${(e as Error).message}`, { file: CONFIG_FILE });
    }
  }
  const fail = (reason: string) => new ShotdocError(reason, { file: CONFIG_FILE });
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
    outDir: resolve(cwd, 'build'),
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  };

  if (obj.baseUrl !== undefined) {
    if (typeof obj.baseUrl !== 'string') throw fail('`baseUrl` must be a string');
    try {
      new URL(obj.baseUrl);
    } catch {
      throw fail(`\`baseUrl\` is not a valid absolute URL: ${obj.baseUrl}`);
    }
    config.baseUrl = obj.baseUrl;
  }
  if (obj.outDir !== undefined) {
    if (typeof obj.outDir !== 'string' || !obj.outDir) throw fail('`outDir` must be a non-empty string');
    config.outDir = resolve(cwd, obj.outDir);
  }
  if (obj.viewport !== undefined) {
    const v = obj.viewport as Record<string, unknown> | null;
    if (typeof v !== 'object' || v === null || Array.isArray(v)) {
      throw fail('`viewport` must be a mapping with `width` and `height`');
    }
    for (const k of Object.keys(v)) {
      if (k !== 'width' && k !== 'height') throw fail(`unknown configuration key \`viewport.${k}\``);
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
    if (typeof s !== 'number' || !(s > 0)) throw fail('`deviceScaleFactor` must be a positive number');
    config.deviceScaleFactor = s;
  }
  return config;
}
