# Design

## Context

See proposal.md for why. Today `Session.start` always makes a fresh browser context and `runDocument` runs the blocks in it; builds are headless and never prompt (specs: `session-state`). Configuration is a small validated mapping (`src/config.ts`), and `goto` fails on any HTTP status of 400 or more. Targets and the `wait` conditions already exist (`locate`, the wait switch in `src/run/steps.ts`).

Spike findings that shape this design (recorded on #5): a saved Playwright `storageState` reloads in a fresh headless context, twice in a row, for a plain cookie login and for an Okta org with MFA; session cookies with no expiry are kept; one site returned 404 on its logged-in pages while rendering them, and an expired cookie is dropped silently on load; page content arrives in stages, so only a specific element is a reliable "ready" signal.

## Goals / Non-Goals

**Goals:**
- A session captured by hand, verified when saved and before every build, reused headless and unattended.
- Credentials never pass through, or are stored by, shotdoc or the project.
- Everything about the login testable without a real identity provider.

**Non-Goals:**
- Logging in programmatically (#26), starting a document logged out or switching state (#25), a clear/logout command and re-checking at the end of a build (#24).
- Reading or reasoning about token or cookie lifetimes. Validity is only ever established by running the check.

## Decisions

**Two commands, the build never prompts.** `shotdoc login` is the only interactive part; `shotdoc build` keeps its "headless and non-interactive" guarantee and fails with a clear message when the login is missing. *Alternative:* the build opens a browser when it finds no valid session. Rejected: it hangs unattended runs and makes the build's behaviour depend on a terminal.

**The check is a positive condition, required, and ignores HTTP status.** `auth.check` takes `visible: <target>` or `text: <string>` (not `hidden`, which a blank page satisfies), plus an optional `url`. The page load does not inspect the status, because the spike found a site that returns 404 for logged-in pages; only the condition decides. A required check means a lapsed session can never silently produce a document of login screens. `check.url` exists because a login page may render the same when logged in, so the page the check loads can differ from `auth.url`. *Alternative:* treat 401/403 or a redirect to another host as "logged out". Rejected as the primary signal (unreliable both ways); it may be added as a supplement later.

**The check runs in a throwaway page.** The check opens its own page in the build's context and closes it, so no page is open when the first block starts and "Acting before navigating fails clearly" still holds. The wait logic is the existing `wait` switch, moved to a shared function used by both the step and the check, so the timeout, target matching and failure wording stay the same.

**Where it runs in the build.** `build` already parses and validates everything before launching a browser. After that, `runDocument` (when `auth` is set) checks the session file exists and is readable JSON, starts the session from it, runs the check, and only then runs blocks. Failures are a `LoginRequiredError` (a `ShotdocError` subclass); the CLI turns it into exit status 3. `scripts/build-examples.mjs` reads status 3 as "skipped: needs login". Nothing is written because the existing flow already writes output only after every step succeeds.

**Saving.** `shotdoc login` creates the context with the build's viewport, scale, locale and time zone, so the saved session comes from the same kind of browser as the builds. On Enter it runs the check in that context and, only if it passes, calls `context.storageState({indexedDB: true})` and writes the file via a temporary file and rename, mode `0600`, in a directory created with mode `0700`. IndexedDB is included because some apps keep tokens there; it is cheap. Builds never write the file back, so reuse cannot be broken by a build that rotates a token.

**The login flow is a function with a seam.** `runLogin(config, {headless, ready})`: the CLI passes `headless: false` and a `ready` that waits for Enter on the terminal; tests pass `headless: true` and a `ready` that drives the page (fills the fixture's form). The CLI checks for an interactive terminal before opening anything.

**Configuration.** `auth` is parsed in `src/config.ts` with the same style of errors as the other keys. Relative `url`s resolve against `baseUrl` like `goto`. The state path is made absolute against the configuration file's directory (default `.shotdoc/auth.json`), so each example's config keeps its own session, and a project can move it with `auth.state`. *Alternative:* a per-user directory outside the repository. Rejected for now: several configs in one repository need separate sessions, and `auth.state` already allows pointing anywhere.

**Git warning only at save time.** After saving, `shotdoc login` runs `git check-ignore` on the file inside its directory; a "not ignored" answer prints a warning, and a missing `git` or a non-repository prints nothing. shotdoc never edits a `.gitignore`. This repository adds `.shotdoc/` to its own.

**Tests use a local fixture app.** A small HTTP server (cookie set by a login form POST, a private page that redirects to `/login` when logged out, one that answers 404 with content when logged in, and a home page that shows a login link when logged out) in `test/helpers`. No test touches a real identity provider; real sites are only for the example and manual checks.

**Example.** `examples/the-internet/` uses https://the-internet.herokuapp.com, a public practice site made for automation, whose login credentials are printed on its login page. Logged out, `/secure` redirects to `/login`; the login page still renders when logged in. The check loads `/secure` and looks for its heading with a selector that matches exactly one element (a role-and-name target would match the page's second heading too, and targets must match one element).

## Risks / Trade-offs

- [Apps keeping tokens in `sessionStorage`, which `storageState` does not save] → the check fails clearly instead of documenting a login page; documented in the README. Not hit in the Okta spike (tokens were in local storage).
- [An identity provider treating headless browsers differently, or binding sessions to a device] → not seen in the Okta spike; the check turns it into a clear failure.
- [A session valid at the check but expired mid-build] → tracked as #24; the window is one build.
- [The saved file is as sensitive as the login] → `0600`, never in the output, never printed, git warning, README says to treat it as a secret.
- [Screenshots show the logged-in user's name and data] → the README points to `hide`/`mask` and the document defaults.
- [The check passes on the wrong thing, such as a target present on the login page too] → the README says to pick something only the logged-in view has; the failure message names the condition.
- [Exit status 3 is new public behaviour] → documented in the spec and README; it only appears for projects with `auth`.

## Migration Plan

Additive: projects without `auth` are unaffected. Rollback is removing the command and the `auth` key.
