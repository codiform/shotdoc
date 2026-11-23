# Tasks

## 1. Configuration

- [x] 1.1 Add `auth` to the configuration in `src/config.ts` (`url`, `check` with `url` and exactly one of `visible` or `text`, `state`), with relative URLs resolved as for `goto` and the state path made absolute against the configuration file's directory (default `.shotdoc/auth.json`); verify config tests for a valid setup, a missing `url`, a missing `check`, both `visible` and `text`, an unknown key at each level, a malformed target, and the default and configured state path
- [x] 1.2 Add `auth` to the README's configuration section (keys, check, state location) and `.shotdoc/` to this repository's `.gitignore`; verify the README test passes and add a check that it mentions `auth` and `shotdoc login`

## 2. Check and session

- [x] 2.1 Move the `wait` condition switch from `src/run/steps.ts` into a shared function used by the step and by the login check, with no change in behaviour; verify the existing wait tests still pass
- [x] 2.2 Add the login check in a new `src/run/login.ts`: open a throwaway page in the context, navigate without inspecting the HTTP status, wait for the condition with the standard timeout, close the page, and fail naming the page and condition; verify tests against a local fixture app (cookie login, a private page that redirects to `/login` when logged out, one that answers 404 with content when logged in, a home page that shows a login link): passes when logged in, fails when logged out, passes on the 404 page, uses `check.url` when `auth.url` renders the same either way
- [x] 2.3 Let `Session.start` take a saved session file; in `runDocument`, when `auth` is configured, fail before starting with `LoginRequiredError` when the file is missing or not valid JSON, start from it, run the check before the first block, and leave no page open; verify tests: logged-in build shows the private view, no session file, corrupt file, expired session (an empty session) all fail with the message telling the author to run `shotdoc login`, the session file is byte-identical afterwards, and a configuration with no `auth` starts clean as before

## 3. The login command

- [x] 3.1 Add `runLogin(config, {headless, ready})` in `src/run/login.ts`: open a context with the build's viewport, scale, locale and time zone, go to `auth.url`, wait for `ready`, run the check, and only on a pass write the session (`storageState` with IndexedDB) through a temporary file and rename, mode `0600` in a directory created `0700`; fail without saving when the check fails or the browser was closed; verify tests that drive the fixture's login form from `ready`: saves on success, an earlier file is replaced by a new login, an early Enter leaves an earlier file unchanged, a closed browser saves nothing, the file mode is `0600`, and nothing in the output or messages contains a cookie value
- [x] 3.2 Add the git warning after a save (`git check-ignore` run in the file's directory; warn on "not ignored", say nothing when git is missing or there is no repository); verify tests in a temporary git repository with the file ignored and not ignored, and outside a repository
- [x] 3.3 Add `shotdoc login [--config <file>] [<file.md>]` to `src/cli.ts` (same configuration choice as build, a usage text, fail when there is no `auth`, fail before opening a browser when stdin is not a terminal, report where the session was saved), and map `LoginRequiredError` to exit status 3 for build; verify CLI tests for argument errors, no `auth`, no terminal, and exit status 3 from a build with no saved session

## 4. Example, docs and checks

- [x] 4.1 Add `scripts/build-examples.mjs` handling for exit status 3 (report "skipped: needs login, run `shotdoc login <source>`", not a failure); verify by running it with an example that has `auth` and no saved session
- [x] 4.2 Add `examples/the-internet/` (config with `baseUrl`, `outDir: output` and `auth` whose check loads `/secure` and looks for its heading with a selector matching exactly one element; a document that starts at `/secure`, takes screenshots, and uses `hide` or `mask` where the page shows anything personal); verify by running `shotdoc login` on it, building it, and checking the built output and images
- [x] 4.3 Write the README section on documenting an app behind a login (the flow, the check and why it is required, where the session lives and that it is a secret, what is not saved such as `sessionStorage`, hiding the user's own data, exit status 3, the example), update the Known limits line about login, and link the example; verify the README test passes and the commands in it run as written
- [x] 4.4 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build:examples` and `openspec validate add-interactive-login --strict`; verify they pass, walk each scenario in the specs to confirm it has a test, listing any gap, and confirm the Okta spike's findings hold with the real command if the author can run it against their site

## Workflow follow-up

- Archive the change after review: it adds the `saved-login` capability and changes "First block starts clean" (`session-state`) and "Minimal configuration" (`doc-build`).
- #5 closes with this change; #24, #25 and #26 remain open for the rest.
