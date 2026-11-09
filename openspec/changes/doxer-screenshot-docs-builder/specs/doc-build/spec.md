# Spec Delta

## Purpose

Defines how doxer turns a source Markdown document containing browser-driving blocks into built documentation with images, without altering the source.

## ADDED Requirements

### Requirement: Build replaces blocks with screenshots
The system SHALL read a source Markdown file, execute its doxer blocks in document order, and write a built Markdown file in which each executed block is replaced by image references to the screenshots it produced. All other Markdown content SHALL pass through unchanged.

#### Scenario: Single block with one screenshot
- **WHEN** a source document contains prose followed by one doxer block that takes one screenshot
- **THEN** the built document contains the same prose and an image reference in place of the block, and the image file exists in the output

#### Scenario: Non-doxer fenced blocks are untouched
- **WHEN** the source contains a fenced code block that is not a doxer block
- **THEN** the built document contains that block exactly as written

### Requirement: Source is never modified
The system SHALL write all build output to a location separate from the source file and SHALL NOT modify or overwrite the source file.

#### Scenario: Source unchanged after build
- **WHEN** a build completes successfully or fails
- **THEN** the source file's contents are byte-identical to before the build

#### Scenario: Output path would collide with source
- **WHEN** the configured output location resolves to the source file itself
- **THEN** the build fails before executing any block and reports the collision

### Requirement: Unbuilt source degrades gracefully
The system SHALL accept source documents that are valid Markdown, such that an unbuilt doxer block is rendered by ordinary Markdown renderers as a fenced code block.

#### Scenario: Source viewed without building
- **WHEN** a source document is rendered by a standard Markdown renderer without running doxer
- **THEN** each doxer block appears as a readable code block and no content is lost

### Requirement: Build fails clearly on block errors
The system SHALL stop the build when a block fails, SHALL identify the failing block by source file and line number with the underlying reason, and SHALL NOT report the build as successful.

#### Scenario: Selector matches nothing
- **WHEN** a block references an element that does not appear within the timeout
- **THEN** the build exits with a non-zero status and the error names the file, line, step, and selector

#### Scenario: No partial output presented as complete
- **WHEN** a block fails midway through a document
- **THEN** the build does not present the output as a completed build

### Requirement: Stable output paths
The system SHALL name image files deterministically from the document and the screenshot name given in the block, so repeated builds of unchanged input write to the same paths.

#### Scenario: Rebuild writes same filenames
- **WHEN** the same source is built twice
- **THEN** both builds produce the same set of image filenames in the same locations
