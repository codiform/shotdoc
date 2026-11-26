# Spec Delta

## MODIFIED Requirements

### Requirement: Supported Node versions
The package SHALL declare Node 22 or later and SHALL be tested on Node 22, 24 and 26. The README SHALL state the required Node version and that the Chromium browser used by Playwright must be installed separately, with the command that installs it, `shotdoc install`.

#### Scenario: Declared floor
- **WHEN** the package is packed
- **THEN** `package.json` declares an `engines` Node range of `>=22`

#### Scenario: README prerequisites
- **WHEN** a reader opens the README's installation instructions
- **THEN** they list Node 22 or later and `shotdoc install`
