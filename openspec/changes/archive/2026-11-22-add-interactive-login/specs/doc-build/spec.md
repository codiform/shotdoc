# Spec Delta

## MODIFIED Requirements

### Requirement: Minimal configuration
The system SHALL read an optional configuration file, supporting a base URL, an output directory, viewport size and device scale defaults, and an optional login (`auth`). Absent keys SHALL take documented defaults, and the absence of any configuration file SHALL be equivalent to an empty one. A relative output directory SHALL resolve against the directory holding the configuration file.

#### Scenario: No configuration file
- **WHEN** no `shotdoc.config.yaml` exists and the document uses only absolute URLs
- **THEN** the build proceeds using the default output directory and defaults

#### Scenario: Unknown configuration key
- **WHEN** the configuration file contains a key the system does not define
- **THEN** the build fails before executing any block and names the key
