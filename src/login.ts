import { relative } from 'node:path';
import { CONFIG_FILE, findConfig, loadConfig } from './config.js';
import { ShotdocError } from './errors.js';
import { runLogin } from './run/login.js';

export interface LoginResult {
  configPath: string | undefined;
  /** Absolute path of the saved session. */
  state: string;
  warning?: string;
}

/**
 * The `shotdoc login` command: chooses the configuration as a build does (from `source`'s directory,
 * or the working directory when there is no source) and logs in with a visible browser. `ready`
 * resolves when the author says they are logged in. Fails before opening a browser when no login is
 * configured.
 */
export async function login(
  source: string | undefined,
  cwd: string,
  opts: { config?: string; ready: (url: string) => Promise<void>; preflight?: () => void },
): Promise<LoginResult> {
  const configPath = findConfig(source ?? CONFIG_FILE, cwd, opts.config);
  const config = loadConfig(configPath, cwd);
  const { auth } = config;
  if (!auth) {
    const where = configPath ? relative(cwd, configPath) : CONFIG_FILE;
    throw new ShotdocError(`no login is configured: add an \`auth\` setting to ${where}`);
  }
  opts.preflight?.();
  const saved = await runLogin({ ...config, auth }, { headless: false, ready: () => opts.ready(auth.url) });
  return { configPath, ...saved };
}
