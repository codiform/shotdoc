# doc-build Specification

## Purpose

Defines how shotdoc turns a source Markdown document containing browser-driving blocks into built documentation with images, without altering the source, and how it reports failure.

## Requirements

### Requirement: Build command
The system SHALL provide a build command that takes the path of a source Markdown file, executes the shotdoc blocks it contains in document order, and writes a built Markdown file and the screenshots those blocks produced to the output directory.

#### Scenario: Successful build
- **WHEN** the build command is run on a source file whose blocks all succeed
- **THEN** it writes the built Markdown file and the images to the output directory and exits with status zero

#### Scenario: Source file missing
- **WHEN** the build command is given a path that does not exist
- **THEN** it exits with a non-zero status and names the missing path

### Requirement: Blocks are replaced by their screenshots
In the built document, each shotdoc block SHALL be replaced by Markdown image references, one per screenshot the block produced, in the order taken. A block that produced no screenshots SHALL be removed. All other content SHALL appear in the built document exactly as written.

#### Scenario: Block with two screenshots
- **WHEN** a block takes screenshots named `home` and `login`
- **THEN** the built document contains an image reference for `home` followed by one for `login` where the block was

#### Scenario: Block with no screenshots
- **WHEN** a block navigates and clicks but takes no screenshot
- **THEN** the block does not appear in the built document and the surrounding text is unchanged

#### Scenario: Non-shotdoc fenced blocks are untouched
- **WHEN** the source contains a fenced code block whose info string is not `shotdoc`
- **THEN** the built document contains that block exactly as written

### Requirement: Source is never modified
The system SHALL write all build output to a location separate from the source file and SHALL NOT modify or overwrite the source file.

#### Scenario: Source unchanged after build
- **WHEN** a build succeeds or fails
- **THEN** the source file's contents are byte-identical to before the build

#### Scenario: Output would overwrite the source
- **WHEN** the built Markdown file's path would be the source file itself
- **THEN** the build fails before executing any block and reports the collision

### Requirement: Unbuilt source degrades gracefully
Source documents SHALL be valid Markdown in which an unbuilt shotdoc block renders as an ordinary fenced code block, so that the source remains readable in standard Markdown viewers without running shotdoc.

#### Scenario: Source viewed without building
- **WHEN** a source document is rendered by a standard Markdown renderer
- **THEN** each shotdoc block appears as a readable code block and no content is lost

### Requirement: Output location and names
Built Markdown SHALL be written as `<output directory>/<source file name>`. Images SHALL be written as `<output directory>/images/<source file name without extension>/<screenshot name>.png`, and image references in the built document SHALL use paths relative to the built file. Names SHALL depend only on the source file name and the screenshot name.

#### Scenario: Deterministic paths
- **WHEN** the same source is built twice
- **THEN** both builds write the same set of file paths

#### Scenario: Relative image reference
- **WHEN** a source file `guide.md` takes a screenshot named `home`
- **THEN** the built `guide.md` references `images/guide/home.png`

### Requirement: Validation before browsing
The system SHALL parse and validate every shotdoc block in the document before launching a browser, and SHALL report problems without executing any step.

#### Scenario: Error in a later block
- **WHEN** the third block of a document is invalid
- **THEN** the build fails without running any step of the first two blocks

#### Scenario: Duplicate screenshot names
- **WHEN** two screenshot steps in one document use the same name
- **THEN** the build fails before launching a browser and names the duplicate and both blocks' lines

### Requirement: Failures are clear and final
When any step fails, the system SHALL stop executing, SHALL exit with a non-zero status, and SHALL NOT write the built Markdown file. The error SHALL name the source file, the line of the block's opening fence, the step number within the block, and the step's target or URL when it has one, followed by the underlying reason.

#### Scenario: Target never appears
- **WHEN** a click step's target does not appear within the timeout
- **THEN** the build exits non-zero, writes no built Markdown, and the message names the file, block line, step number, and the target

#### Scenario: Navigation fails
- **WHEN** a goto step receives an HTTP error response for the page
- **THEN** the build fails and the message names the URL and the status

### Requirement: Minimal configuration
The system SHALL read an optional `shotdoc.config.yaml` from the working directory, supporting a base URL, an output directory, and viewport size and device scale defaults. Absent keys SHALL take documented defaults, and an absent file SHALL be equivalent to an empty one.

#### Scenario: No configuration file
- **WHEN** no `shotdoc.config.yaml` exists and the document uses only absolute URLs
- **THEN** the build proceeds using the default output directory and defaults

#### Scenario: Unknown configuration key
- **WHEN** the configuration file contains a key the system does not define
- **THEN** the build fails before executing any block and names the key
