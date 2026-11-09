# Spec Delta

## Purpose

Defines the syntax authors use inside fenced blocks to drive a browser: declarative YAML steps, a JavaScript escape hatch, and header attributes shared by both.

## ADDED Requirements

### Requirement: Block identification
The system SHALL treat a fenced code block whose info string begins with `doxer` as a doxer block, and SHALL parse any further tokens in the info string as attributes.

#### Scenario: Recognised block
- **WHEN** a fence opens with ```` ```doxer ````
- **THEN** the block is executed as a doxer block

#### Scenario: Unknown attribute
- **WHEN** a doxer block's info string contains an unrecognised attribute
- **THEN** the build fails before executing any block and names the attribute and its line

### Requirement: YAML step blocks
By default a doxer block body SHALL be a YAML list of steps executed in order. The system SHALL support at least these steps: `goto`, `click`, `fill`, `wait`, `screenshot`, `highlight`, `arrow`, `hide`, and `mask`.

#### Scenario: Navigate and capture
- **WHEN** a block contains `goto` followed by `screenshot` steps
- **THEN** the browser navigates to the URL and a screenshot with the given name is produced

#### Scenario: Invalid step
- **WHEN** a block contains a step name that is not supported or malformed YAML
- **THEN** the build fails before launching a browser and reports the file, line, and problem

### Requirement: Relative URLs resolve against a base URL
The system SHALL resolve relative `goto` targets against a configured base URL, and SHALL allow absolute URLs to be used as written.

#### Scenario: Relative path
- **WHEN** the base URL is `https://example.test` and a block contains `goto: /login`
- **THEN** the browser navigates to `https://example.test/login`

#### Scenario: Relative path without base URL
- **WHEN** no base URL is configured and a block uses a relative `goto`
- **THEN** the build fails and states that a base URL is required

### Requirement: JavaScript escape-hatch blocks
A doxer block carrying the `js` attribute SHALL have its body executed as JavaScript with access to the current browser page, and SHALL be able to produce screenshots using the same capture capabilities as YAML blocks.

#### Scenario: Custom interaction
- **WHEN** a `js` block performs an interaction not available as a YAML step and then captures a screenshot
- **THEN** the interaction runs against the current page and the screenshot appears in the built output

#### Scenario: Script throws
- **WHEN** a `js` block throws an error
- **THEN** the build fails and reports the block's file and line with the error message

### Requirement: Shared state attributes
Both YAML and `js` blocks SHALL accept the attributes `state=fresh`, `state=<name>`, and `save=<name>`, with the behaviour defined by the session-state capability.

#### Scenario: Attribute on a js block
- **WHEN** a block is written ```` ```doxer js state=fresh ````
- **THEN** it runs in a new browser context exactly as a YAML block with `state=fresh` would
