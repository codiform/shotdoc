# Proposal

## Why

Many apps worth documenting sit behind a login, often an OAuth/MFA provider such as Okta or Entra, and the credentials cannot go into the project or the document. Today every build starts from a clean browser, so shotdoc cannot document any of them. This is the first, pressing slice of #5: the author logs in once by hand, and builds then reuse that session. Spikes against a plain username/password site and an Okta preview org with MFA showed the approach works (a saved Playwright `storageState` reloads headless, twice in a row), and that HTTP status codes cannot tell us whether we are logged in: one site returns 404 for its logged-in pages, and a saved session can lapse silently. So a build must verify the login before it runs, not just load the saved state.

## What Changes

- A new command, `shotdoc login`, opens a visible browser at the login URL from the configuration. The author logs in by hand, including MFA, and presses Enter. shotdoc then runs the login check and, only if it passes, saves the session. Nothing about the credentials passes through shotdoc.
- The configuration file gets an optional `auth` setting: the login URL, a required positive check (a visible target or text that appears only when logged in, optionally on a different page), and an optional location for the saved session.
- When `auth` is configured, a build starts from the saved session instead of a clean browser, and runs the check before any block. A missing, unreadable or no-longer-valid session fails the build with a message telling the author to run `shotdoc login`, and nothing is written. That failure has its own exit status, so scripts can tell it from other failures.
- The saved session lives next to the configuration file in `.shotdoc/` by default, is never written to the output, and `shotdoc login` warns when the file would not be ignored by git.
- `npm run build:examples` treats the "not logged in" failure as a skip, not a failure.
- README: a new section on documenting an app behind a login, and the "named login states" line in Known limits is narrowed.
- A new example, `examples/the-internet/`, documents a page behind the login at the public practice site the-internet.herokuapp.com.

Out of scope, tracked separately: a document that starts logged out or switches state midway (#25), clearing a saved session and checking again at the end of a build (#24), and logging in with stored credentials (#26).

## Capabilities

### New Capabilities

- `saved-login`: the `auth` configuration, the `shotdoc login` command, the login check, where the saved session is kept, and builds that start from it.

### Modified Capabilities

- `session-state`: "First block starts clean" gains the exception for a configured login, and the clean-start guarantee is stated for the case without one.
- `doc-build`: "Minimal configuration" lists the new `auth` setting.

## Impact

- `src/cli.ts` (a second command), `src/config.ts` (`auth`), `src/run/session.ts` (start from a saved session), `src/build.ts` and `src/run/run.ts` (check before the blocks), and a new module for the login flow and the check.
- `.gitignore` gains `.shotdoc/`; `scripts/build-examples.mjs`, `README.md`, tests (a local fixture app with a cookie login), and a new example.
- No new dependency. Playwright's `storageState` does the saving and loading.
- Builds of projects with no `auth` setting behave exactly as before.
