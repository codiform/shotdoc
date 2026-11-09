# session-state Specification

## Purpose

Defines the simple browser session model: a document runs in one continuous session so a walkthrough can span many blocks without mentioning state.

## Requirements

### Requirement: One continuous session per document
The system SHALL run all blocks of a document in a single browser session and page, so that each block begins in the state the previous block left. Authors SHALL NOT need to mention state in a simple walkthrough.

#### Scenario: Walkthrough across blocks
- **WHEN** block A navigates to a page and block B, with no attributes, clicks an element on that page
- **THEN** block B's click runs against the page block A left open

#### Scenario: Page state persists
- **WHEN** block A adds an item to a list and block B takes a screenshot
- **THEN** the screenshot shows the added item

### Requirement: First block starts clean
The first block SHALL start in a new browser context with no cookies, storage, or open page. Each build SHALL start from such a context regardless of earlier builds.

#### Scenario: Repeat builds are independent
- **WHEN** a build logs in or adds items and the same document is built again
- **THEN** the second build's first block starts with no cookies or stored data from the first

### Requirement: Acting before navigating fails clearly
A step that needs an open page, other than `goto`, SHALL fail with a message saying that no page is open and that the block should begin with a `goto`.

#### Scenario: Screenshot before goto
- **WHEN** the first step of the first block is a click
- **THEN** the build fails and the message says to begin with a goto

### Requirement: Builds are headless and non-interactive
The system SHALL run builds without a visible browser window and SHALL NOT prompt the user during a build.

#### Scenario: Unattended build
- **WHEN** a build is run with no terminal input available
- **THEN** it completes or fails without waiting for input or opening a window
