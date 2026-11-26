# package-distribution Specification

## Purpose

Defines what the published shotdoc package contains, that an installed copy runs, what it declares about itself (license, repository, Node versions), and that publishing cannot ship stale or unintended files.

## Requirements

### Requirement: Package contents
The published package SHALL contain only the compiled output (`dist/`), `README.md`, `package.json` and `LICENSE`. It SHALL NOT contain source, tests, examples, OpenSpec files, saved sessions, or build output of any example.

#### Scenario: Only the intended files
- **WHEN** the package is packed
- **THEN** every file in it is under `dist/` or is `README.md`, `package.json` or `LICENSE`

#### Scenario: Saved session never packed
- **WHEN** a `.shotdoc/` directory with a saved session exists in the project
- **THEN** the packed package does not contain it

### Requirement: Installed package runs
A package installed from the packed tarball into an empty project SHALL provide a `shotdoc` command that prints its usage, reports an invalid document with a non-zero exit status, and builds a document that drives a local page, writing the built Markdown and its screenshots.

#### Scenario: Usage
- **WHEN** `shotdoc --help` is run from the installed package
- **THEN** it prints the usage and exits with status 0

#### Scenario: Invalid document
- **WHEN** the installed `shotdoc build` is given a document with an unknown step
- **THEN** it exits non-zero and names the step

#### Scenario: Build
- **WHEN** the installed `shotdoc build` is given a document that visits a local page and takes a screenshot
- **THEN** the built Markdown and the screenshot are written

### Requirement: Package metadata
The package SHALL be named `shotdoc`, SHALL declare the MIT license and include a `LICENSE` file naming Codiform as the copyright holder, and SHALL declare its repository, homepage and issue tracker. Its version SHALL be below 1.0.0 until the project calls it stable, and the README SHALL say that the release is early and that minor versions may break.

#### Scenario: License declared
- **WHEN** the package is packed
- **THEN** `package.json` declares `MIT` and `LICENSE` is in the package

#### Scenario: Status stated
- **WHEN** a reader opens the README at its top
- **THEN** it says the release is early and not yet stable

### Requirement: Supported Node versions
The package SHALL declare Node 22 or later and SHALL be tested on Node 22, 24 and 26. The README SHALL state the required Node version and that the Chromium browser used by Playwright must be installed separately, with the command that installs it, `shotdoc install`.

#### Scenario: Declared floor
- **WHEN** the package is packed
- **THEN** `package.json` declares an `engines` Node range of `>=22`

#### Scenario: README prerequisites
- **WHEN** a reader opens the README's installation instructions
- **THEN** they list Node 22 or later and `shotdoc install`

### Requirement: Publishing builds first
Packing or publishing the package SHALL first compile the source, and publishing SHALL also run the tests, so a stale or untested build cannot be published.

#### Scenario: Pack compiles
- **WHEN** the package is packed after the source changed
- **THEN** the packed `dist/` reflects the changed source

#### Scenario: Publish runs the tests
- **WHEN** a publish is attempted and a test fails
- **THEN** the publish stops before anything is uploaded
