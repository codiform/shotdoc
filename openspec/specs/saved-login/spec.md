# saved-login Specification

## Purpose

Lets a document describe an app behind a login without any credentials in the project: the author logs in once by hand, shotdoc verifies and saves the session, and later builds reuse it after checking it is still valid.

## Requirements

### Requirement: Login configuration
The configuration file MAY contain `auth`, a mapping with `url` (the page where login starts), `check` and optionally `state`. `check` SHALL hold exactly one condition, `visible` (a target) or `text` (a string), and MAY hold `url`, the page to load for the check (default: `auth.url`). Relative URLs resolve against `baseUrl` as for `goto`. A missing `url` or `check`, an unknown key, or a malformed value SHALL fail validation before any browser is launched.

#### Scenario: Valid login configuration
- **WHEN** the configuration has `auth` with `url: /login` and `check: {url: /secure, visible: {role: heading, name: Secure Area}}`
- **THEN** validation succeeds

#### Scenario: Check is required
- **WHEN** `auth` has a `url` but no `check`
- **THEN** validation fails and the message says a check is required

#### Scenario: One condition only
- **WHEN** `check` has both `visible` and `text`
- **THEN** validation fails and the message says to give exactly one

#### Scenario: Unknown key
- **WHEN** `auth` contains a key the system does not define
- **THEN** validation fails and names the key and the known keys

### Requirement: Login command
`shotdoc login [--config <file>] [<file.md>]` SHALL choose the configuration file as the build command does. It SHALL open a visible browser, with the build's viewport, at `auth.url`, tell the author to log in and press Enter, and on Enter run the login check. It SHALL fail when the configuration has no `auth`. It SHALL need an interactive terminal and fail without opening a browser when there is none.

#### Scenario: Logging in
- **WHEN** the author runs `shotdoc login`, logs in in the browser window and presses Enter
- **THEN** the check runs and, if it passes, the session is saved and the command reports where

#### Scenario: No login configured
- **WHEN** the configuration has no `auth`
- **THEN** `shotdoc login` exits non-zero and says no login is configured

#### Scenario: No terminal
- **WHEN** `shotdoc login` is run with no interactive terminal
- **THEN** it exits non-zero without opening a browser and says it needs a terminal

#### Scenario: Browser closed early
- **WHEN** the author closes the browser window before pressing Enter
- **THEN** the command exits non-zero, says nothing was saved, and leaves any earlier saved session unchanged

### Requirement: Login check
The check SHALL load its page and wait for its condition within the standard timeout. The HTTP status of the page SHALL NOT decide the outcome: only the condition does. A failed check SHALL be reported with the page and the condition, and SHALL say the author is not logged in.

#### Scenario: Condition appears
- **WHEN** the check page shows the target while logged in
- **THEN** the check passes

#### Scenario: Error status but logged in
- **WHEN** the check page responds with HTTP 404 but renders the target
- **THEN** the check passes

#### Scenario: Redirected to a login page
- **WHEN** the check page redirects to a login form that lacks the target
- **THEN** the check fails with a message naming the page and the condition

#### Scenario: Login page that also renders when logged in
- **WHEN** `auth.url` shows a login form even when logged in and `check.url` names a page that shows the target only when logged in
- **THEN** the check uses `check.url` and passes

### Requirement: Saved session is stored only on a passing check
`shotdoc login` SHALL save the session (cookies, local storage and IndexedDB) only when the check passes, replacing any earlier saved session as a whole. A failed check SHALL leave the earlier saved session unchanged and SHALL exit non-zero.

#### Scenario: Check fails
- **WHEN** the author presses Enter before finishing the login and the check fails
- **THEN** nothing is saved, an earlier saved session is unchanged, and the command exits non-zero

#### Scenario: Replacing a session
- **WHEN** a session was saved earlier and the author logs in again successfully
- **THEN** the saved session is the new one

### Requirement: Saved session location and protection
The saved session SHALL be a file at `auth.state`, resolved against the directory holding the configuration file, or by default at `.shotdoc/auth.json` in that directory. The file SHALL be readable only by its owner, SHALL NOT be written to the output directory or into the built document, and no cookie or storage value SHALL be printed. When the file lies in a git repository and is not ignored, `shotdoc login` SHALL warn.

#### Scenario: Default location
- **WHEN** the configuration is `examples/demo/shotdoc.config.yaml` with `auth` and no `state`
- **THEN** the session is saved at `examples/demo/.shotdoc/auth.json`

#### Scenario: Configured location
- **WHEN** `auth.state` is `secrets/login.json`
- **THEN** the session is saved at `secrets/login.json` beside the configuration file

#### Scenario: Not ignored by git
- **WHEN** the saved session's path is in a git repository and git does not ignore it
- **THEN** `shotdoc login` prints a warning that the file holds session cookies and should be ignored

#### Scenario: Output contains no session
- **WHEN** a build with a saved session completes
- **THEN** the output directory and built document contain no cookie or storage value from it

### Requirement: Builds start from the saved session
When the configuration has `auth`, a build SHALL start its browser from the saved session and run the login check before any block. No page SHALL be open when the first block starts. The build SHALL NOT change the saved session file.

#### Scenario: Logged-in build
- **WHEN** a valid session was saved and the document's first block navigates to a page that needs it
- **THEN** the page shows the logged-in view

#### Scenario: Session file unchanged
- **WHEN** a build completes
- **THEN** the saved session file is byte for byte as it was

#### Scenario: No login configured
- **WHEN** the configuration has no `auth`
- **THEN** the build starts from a clean browser as before

### Requirement: Build fails when not logged in
When `auth` is configured and the saved session is missing, unreadable or fails the check, the build SHALL fail before any block runs, write no output, and exit with status 3. The message SHALL say the session is not valid, name the configuration, and tell the author to run `shotdoc login`.

#### Scenario: No saved session
- **WHEN** `auth` is configured and no session file exists
- **THEN** the build exits with status 3 and tells the author to run `shotdoc login`

#### Scenario: Session no longer valid
- **WHEN** the saved session has expired and the check does not find its condition
- **THEN** the build exits with status 3, names the check condition, writes no output, and tells the author to run `shotdoc login`

#### Scenario: Unreadable session file
- **WHEN** the session file is not valid JSON
- **THEN** the build exits with status 3 and says the saved session could not be read
