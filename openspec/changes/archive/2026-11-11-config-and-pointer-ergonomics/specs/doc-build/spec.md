# Spec Delta

## MODIFIED Requirements

### Requirement: Minimal configuration
The system SHALL read an optional configuration file, supporting a base URL, an output directory, and viewport size and device scale defaults. Absent keys SHALL take documented defaults, and the absence of any configuration file SHALL be equivalent to an empty one. A relative output directory SHALL resolve against the directory holding the configuration file.

#### Scenario: No configuration file
- **WHEN** no `shotdoc.config.yaml` exists and the document uses only absolute URLs
- **THEN** the build proceeds using the default output directory and defaults

#### Scenario: Unknown configuration key
- **WHEN** the configuration file contains a key the system does not define
- **THEN** the build fails before executing any block and names the key

## ADDED Requirements

### Requirement: Configuration file selection
The configuration file SHALL be chosen in this order: the path given with `--config <path>` on the build command; otherwise the first `shotdoc.config.yaml` found in the source file's directory or the nearest parent above it; otherwise `shotdoc.config.yaml` in the working directory, if present. A file named with `--config` that does not exist or cannot be read SHALL fail the build, naming the path. When the file used is not in the working directory, the build command SHALL report its path.

#### Scenario: Configuration found above the source
- **WHEN** the build command is run from the project root on `examples/demo/input/doc.md`, and `examples/demo/shotdoc.config.yaml` exists with `outDir: output`
- **THEN** that file's settings are used, output is written under `examples/demo/output`, and the build output names the configuration file used

#### Scenario: Nearest configuration wins
- **WHEN** both `examples/demo/shotdoc.config.yaml` and `examples/demo/input/shotdoc.config.yaml` exist and the source is `examples/demo/input/doc.md`
- **THEN** the file in `examples/demo/input` is used

#### Scenario: Named configuration file
- **WHEN** the build command is run with `--config shared/shotdoc.config.yaml` on a source file that has another configuration file above it
- **THEN** the named file is used and the other is ignored

#### Scenario: Missing named configuration file
- **WHEN** `--config` names a file that does not exist
- **THEN** the build fails before executing any block and names the path

#### Scenario: Default location unchanged
- **WHEN** the build command is run without `--config` in a directory holding `shotdoc.config.yaml` with `outDir: out`, on a source file in that directory
- **THEN** output is written to `out` in that directory, and the configuration file is not reported because it is in the working directory

#### Scenario: Falls back to the working directory
- **WHEN** the source file has no configuration file in its directory or any parent, and the working directory holds `shotdoc.config.yaml`
- **THEN** the working directory's file is used
