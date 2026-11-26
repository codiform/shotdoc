# Proposal

## Why

Installing the right browser is the first thing a new user does, and it can silently go wrong. shotdoc runs only the Chromium build that its own Playwright was released with, but the README tells people to run `npx playwright install chromium`, and `npx` may find a *different* Playwright (for example the one in another project's `node_modules`). The result is a Chromium that is installed but is the wrong build, and shotdoc still reports it as missing, without saying why (#30). It happened on the first real trial.

## What Changes

- A new `shotdoc install` command that installs the browser using the copy of Playwright that shotdoc itself loads, so the installed build always matches. Extra arguments are passed to Playwright's installer, so `--with-deps` (Linux CI) and `--dry-run` work.
- The missing-browser error is rewritten: it names the Playwright version and the browser location it was looking for, says that a Chromium installed by a different Playwright version does not count, and tells the user to run `shotdoc install`.
- The README's Install section uses `shotdoc install`, drops the caveat about other package managers, and says that `npx shotdoc` can be used without a project install. A short note says npm is the tested way to install and that problems with other package managers or runtimes are welcome as issues.
- The `package-distribution` requirement that names the Chromium command in the README now names `shotdoc install`.

Out of scope: installing automatically when the browser is missing, detecting the package manager, choosing a different browser (#31), and changing CI or CONTRIBUTING, where the clone's own Playwright already matches.

Not tested here: pnpm, Yarn (including Plug'n'Play), Bun and Deno. They are not excluded. The command does not depend on the package manager, and a problem reported for one will be looked at then.

## Capabilities

### New Capabilities
- `browser-install`: how a user gets the browser shotdoc needs, and what shotdoc says when it is missing.

### Modified Capabilities
- `package-distribution`: the README's instruction for installing the browser names `shotdoc install`.

## Impact

- `src/cli.ts` (a new command and usage text), a new module for the install command, and `src/run/session.ts` (the error message).
- `README.md` (Install section), `test/readme.test.ts`, `test/cli.test.ts`.
- Nothing about builds or saved logins changes.
