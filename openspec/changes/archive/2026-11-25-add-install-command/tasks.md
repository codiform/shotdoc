# Tasks

## 1. The command and the message

- [x] 1.1 Add the `install` command in `src/cli.ts` (usage text included) with its own module: resolve `playwright/package.json` from shotdoc's own location, read its `bin` entry, and run it with Node as `install` plus the given arguments (default `chromium`) with inherited output, exiting with its status (non-zero when it cannot be run); verify `node dist/cli.js install --dry-run chromium` exits 0 and lists the install locations, and `node dist/cli.js --help` shows the command
- [x] 1.2 Rewrite the missing-browser error in `src/run/session.ts`: the missing location when the error text has one, the Playwright version, that a browser from a different Playwright version does not count, and `shotdoc install`; leave other launch errors as they are; verify with the empty-`PLAYWRIGHT_BROWSERS_PATH` run that the message shows all of those, and that a different launch error still shows its own reason

## 2. Tests

- [x] 2.1 In `test/cli.test.ts`, update "missing Chromium gives the install command" for the new message (location, version, `shotdoc install`, and no output written), and add tests for `install`: `--dry-run chromium` exits 0 and prints a location without downloading; it works in a directory with no config file; it succeeds in a directory whose `node_modules/.bin/playwright` is a stub that fails (the stub is not run); a failing installer argument makes it exit non-zero; verify `npx vitest run test/cli.test.ts` passes and the new tests fail against the old code

## 3. Documentation and package check

- [x] 3.1 README Install section: `shotdoc install` in place of `npx playwright install chromium`, remove the pnpm and Yarn caveat and the link to #30, say `npx shotdoc` works without a project install, and add one sentence that npm is the tested way to install and that problems with other package managers or runtimes can be reported as issues; update the two assertions in `test/readme.test.ts` that look for the old command; verify by reading the section top to bottom and `npx vitest run test/readme.test.ts` passes
- [x] 3.2 In `scripts/smoke-package.mjs`, run the installed `shotdoc install --dry-run chromium` and require status 0 and a printed install location; verify `npm run smoke:package` passes, and fails when the installed package cannot find Playwright's installer

## 4. Final checks

- [x] 4.1 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run smoke:package` and `openspec validate add-install-command --strict`; verify they pass, and walk each scenario in the two delta specs to confirm it has a test or a check, listing any gap

## Workflow follow-up

- After merging: comment on #30 and close it, and archive this change (the `browser-install` capability is new, and `package-distribution` is modified).
- #31 (choosing the browser) can later add a mention of channels to the missing-browser message.
