# Design

## Context

See proposal.md for why. Today `src/run/session.ts` launches Chromium with Playwright and, when the launch error contains "Executable doesn't exist", throws a fixed message telling the user to run `npx playwright install chromium`; any other launch error is reported with its first line. A test in `test/cli.test.ts` forces the missing case with an empty `PLAYWRIGHT_BROWSERS_PATH` and checks the old command. `playwright` 1.65.0 exports its `package.json`, and that file's `bin` names the installer (`cli.js`). `playwright install --dry-run chromium` prints the install locations and download URLs without downloading, and exits 0. Playwright's cache here holds several Chromium revisions side by side, so an installed browser for the wrong revision is the normal way to hit this.

## Goals / Non-Goals

**Goals:**
- Whoever runs `shotdoc install` gets the browser this copy of shotdoc will launch, from any directory.
- A missing browser explains itself well enough to act on.
- Nothing about builds, logins or configuration changes.

**Non-Goals:**
- Downloading anything without being asked.
- Package-manager detection, and testing every package manager or runtime. Others are best-effort: shotdoc does not rule them out, and fixes a problem when someone reports one.
- Choosing another browser (#31).

## Decisions

**`shotdoc install` runs the installer that belongs to the Playwright shotdoc loads.** The command resolves `playwright/package.json` the way shotdoc itself finds Playwright (relative to its own files, not the current directory), reads the `bin` entry for the installer, and runs it with Node: `node <installer> install <arguments>`, with the child's output going straight to the terminal and its exit status becoming shotdoc's. Because it is the same copy that later launches the browser, the revision always matches, and the directory it is run from does not matter. *Alternative:* keep telling users to run `npx playwright install chromium`. Rejected: that is the bug, since `npx` searches from the current directory. *Alternative:* call Playwright's internal install functions. Rejected: not a public API, and the CLI is.

**Arguments pass through; the default is Chromium.** `shotdoc install` with no arguments installs Chromium (what shotdoc needs, including the headless shell). Arguments go to Playwright unchanged, so `--with-deps`, `--dry-run` and other options work and shotdoc does not have to know them. Chromium is added only when no browser is named, because Playwright's own default with no name is to install several browsers; so `shotdoc install --with-deps` still means Chromium, and `shotdoc install firefox` means Firefox. *Alternative:* a fixed set of shotdoc options. Rejected: it would have to track Playwright's.

**The error keeps the existing detection and adds what Playwright already told us.** The "Executable doesn't exist" launch error contains the missing path, which includes the browser revision. The new message includes that path when it can be read from the error, and the Playwright version from the same `package.json` the installer comes from. It says that a browser installed by a different Playwright version does not count, and tells the user to run `shotdoc install`. If the path cannot be read from the error text, the message leaves it out and still gives the version and the command; it never fails because of the parsing. Other launch errors are unchanged. *Alternative:* check for the browser before launching. Rejected: headless and headed runs use different executables, and Playwright already knows which one it needs.

**The command is written without a package-manager prefix.** The error says "run `shotdoc install`", because shotdoc cannot tell whether it was started by `npx`, `pnpm exec` or a plain bin. The README shows the `npx` form and notes that npm is the tested way to install shotdoc; other package managers and runtimes are not ruled out, only untested, and a reported problem will be looked at. *Alternative:* guess from `npm_config_user_agent`. Rejected for now: it is absent when the bin is run directly and the benefit is small.

**Tests need no download.** The missing-browser case uses an empty `PLAYWRIGHT_BROWSERS_PATH`, as the existing test does. Pass-through uses `install --dry-run chromium`, which downloads nothing. "Matches this shotdoc, not the directory" is tested by running the command in a directory whose `node_modules/.bin/playwright` is a stub that fails: the command must succeed without running the stub. The packaged smoke test also runs `shotdoc install --dry-run chromium` from the installed tarball, which shows the installed copy finds its own Playwright.

**Leave CI and CONTRIBUTING alone.** In a clone, `npx playwright install chromium` finds the clone's own Playwright, so it matches. Changing them would add a build step to CI for nothing.

## Risks / Trade-offs

- [The installer's location comes from Playwright's `bin` entry] → that is its documented command; if it moves, the install command fails with a clear error, and a test (the dry run) fails first.
- [Running Playwright's installer under a runtime other than Node] → untested and documented as such; shotdoc requires Node, and a report for another runtime will be looked at.
- [The error text depends on Playwright's message format] → the path is optional in the message and the detection is unchanged, so a format change degrades the message, not the behaviour.
- [`--with-deps` needs system permissions on Linux] → Playwright's concern; the arguments pass through.

## Migration Plan

Additive. A user who still runs `npx playwright install chromium` from a matching directory keeps working. Order: the command, the message, tests, README, smoke test, then a final run. Rollback is reverting the commit.

## Open Questions

- None blocking. Whether the error should later mention `channel` or an installed Chrome as an alternative depends on #31.
