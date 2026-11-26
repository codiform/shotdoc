# Spec Delta

## Purpose

Defines how a user installs the browser shotdoc drives, so that it always matches the Playwright version shotdoc itself uses, and what shotdoc reports when the browser it needs is not there.

## ADDED Requirements

### Requirement: Install command
`shotdoc install` SHALL install the browser that this copy of shotdoc needs, using the Playwright it loads, whatever directory it is run from. It SHALL accept further arguments and pass them to Playwright's installer unchanged. It SHALL exit with the installer's status, and with a non-zero status when the installer cannot be run. It SHALL work without a document or configuration file.

#### Scenario: Installs for this shotdoc
- **WHEN** `shotdoc install` is run in a directory that has its own, different Playwright
- **THEN** the browser installed is the one this shotdoc's Playwright expects, not the one the other Playwright expects

#### Scenario: Arguments are passed on
- **WHEN** `shotdoc install --dry-run chromium` is run
- **THEN** it lists what would be installed and where, downloads nothing, and exits with status 0

#### Scenario: Failure is reported
- **WHEN** the installer exits non-zero
- **THEN** `shotdoc install` exits non-zero too

### Requirement: Missing browser message
When the browser needed to build or log in is not installed, shotdoc SHALL stop with an error that says the browser is missing, names the location where it looked and the Playwright version it expects, says that a browser installed by a different Playwright version does not count, and tells the user to run `shotdoc install`. It SHALL not write any output.

#### Scenario: Browser missing
- **WHEN** `shotdoc build` is run and the browser is not installed
- **THEN** it exits non-zero, writes no output, and the error names the missing location, the Playwright version, and `shotdoc install`

#### Scenario: Other launch failures unchanged
- **WHEN** the browser is installed but cannot start for another reason
- **THEN** the error reports the reason as before and does not tell the user to install the browser
