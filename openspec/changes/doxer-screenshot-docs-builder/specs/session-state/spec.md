# Spec Delta

## Purpose

Defines how browser sessions persist or reset across blocks, how named states are saved and loaded, and how authentication is handled without capturing misleading screenshots.

## ADDED Requirements

### Requirement: Sessions continue by default
The system SHALL run consecutive blocks in the same browser session and page by default, so that a block begins where the previous block ended.

#### Scenario: Continuing a walkthrough
- **WHEN** block A navigates to a page and block B, with no state attribute, clicks an element on that page
- **THEN** block B's click runs against the page block A left open

### Requirement: Fresh sessions
A block with `state=fresh` SHALL run in a new browser context with no cookies, storage, or page carried over, and its execution SHALL NOT depend on any preceding block having run.

#### Scenario: Starting clean
- **WHEN** a block with `state=fresh` follows a block that logged in
- **THEN** the fresh block runs unauthenticated

### Requirement: Saving named state
A block with `save=<name>` SHALL, after it completes successfully, store the session's cookies and local storage under that name for later blocks and later builds.

#### Scenario: Save after login
- **WHEN** a block logs in and carries `save=logged-in`
- **THEN** a state named `logged-in` is stored and available to later blocks

#### Scenario: Failed block does not save
- **WHEN** a block with `save=<name>` fails
- **THEN** no state is written under that name

### Requirement: Loading named state
A block with `state=<name>` SHALL run in a new browser context initialised from the saved state of that name. The context SHALL NOT retain any page or URL, so the block is expected to begin with navigation.

#### Scenario: Reuse login
- **WHEN** state `logged-in` exists and a block with `state=logged-in` navigates to a protected page
- **THEN** the page loads as the logged-in user

#### Scenario: Unknown state name
- **WHEN** a block references a state name that has never been saved
- **THEN** the build fails before running that block and states which name is missing and how to create it

### Requirement: Interactive login command
The system SHALL provide a command that opens a visible browser, lets the user log in manually, and on completion saves the resulting session under a user-given name.

#### Scenario: Manual login saved
- **WHEN** the user runs the login command with a name and completes login in the opened browser
- **THEN** the state is saved under that name and subsequent builds can load it without a visible browser

### Requirement: Headless builds
Builds SHALL run without a visible browser and without user interaction.

#### Scenario: CI-style build
- **WHEN** a build is run with all required named states already saved
- **THEN** it completes without prompting the user or opening a visible window

### Requirement: Expired or missing authentication is detected
The system SHALL fail a block that loads a named state whose session is no longer valid, rather than producing screenshots of a login or error page. Validity SHALL be determined by an author-supplied check for the state.

#### Scenario: Expired session
- **WHEN** a block loads a state and the author's validity check fails
- **THEN** the build fails with a message saying the state has expired and how to refresh it, and no screenshot from that block is written

### Requirement: Saved states are treated as secrets
The system SHALL store saved states in a location that is excluded from version control by default and SHALL NOT embed state contents in built output.

#### Scenario: Default ignore
- **WHEN** a state is saved for the first time in a repository
- **THEN** the state file's location is ignored by version control or the user is warned that it is not
