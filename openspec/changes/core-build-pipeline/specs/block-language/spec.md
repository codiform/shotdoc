# Spec Delta

## Purpose

Defines the syntax authors use inside fenced blocks to drive a browser: YAML steps, how steps refer to page elements, and how unsupported or future syntax is rejected.

## ADDED Requirements

### Requirement: Block identification
The system SHALL treat a fenced code block whose info string begins with the word `shotdoc` as a shotdoc block. Any further whitespace-separated tokens in the info string SHALL be treated as attributes.

#### Scenario: Recognised block
- **WHEN** a fence opens with ```` ```shotdoc ````
- **THEN** the block is executed as a shotdoc block

#### Scenario: Different language
- **WHEN** a fence opens with ```` ```yaml ````
- **THEN** the block is not treated as a shotdoc block

### Requirement: Blocks must be at the top level
A shotdoc block SHALL appear at the top level of the document. A shotdoc block nested inside another Markdown structure, such as a list item or a blockquote, SHALL fail validation with a message naming the block's line and saying it must be at the top level.

#### Scenario: Block inside a list item
- **WHEN** a shotdoc block is indented inside a list item
- **THEN** the build fails before executing any block and names the line

#### Scenario: Top-level block after a list
- **WHEN** a shotdoc block follows a list at the top level
- **THEN** the block is accepted

### Requirement: Unsupported and unknown attributes are rejected
A shotdoc block with any attribute SHALL fail validation. The reserved attributes `js`, `state=<value>`, and `save=<value>` SHALL produce a message saying the attribute is not supported yet; any other attribute SHALL produce a message saying it is unknown. Both messages SHALL name the attribute and the line of the block.

#### Scenario: Reserved attribute
- **WHEN** a block is written ```` ```shotdoc state=fresh ````
- **THEN** the build fails before executing any block with a message that `state=fresh` is not supported yet

#### Scenario: Unknown attribute
- **WHEN** a block is written ```` ```shotdoc fast ````
- **THEN** the build fails before executing any block with a message that `fast` is unknown

### Requirement: YAML step lists
A shotdoc block body SHALL be a YAML list in which each item is a mapping with exactly one key naming a step. The supported steps SHALL be `goto`, `click`, `fill`, `wait`, and `screenshot`. Invalid YAML, a non-list body, an item without exactly one key, or an unsupported step name SHALL fail validation naming the file, the block's line, and the step number where one applies.

#### Scenario: Valid block
- **WHEN** a block contains `- goto: /` followed by `- screenshot: {name: home}`
- **THEN** validation succeeds and the steps run in the order written

#### Scenario: Unsupported step name
- **WHEN** a block contains a step named `hover`
- **THEN** validation fails and names the step number and the unsupported step

#### Scenario: Malformed YAML
- **WHEN** a block body is not valid YAML
- **THEN** validation fails and the message names the file and the block's line

### Requirement: Goto step
`goto` SHALL take a URL string. A relative URL SHALL be resolved against the configured base URL, and an absolute URL SHALL be used as written. When a relative URL is used and no base URL is configured, validation SHALL fail and state that a base URL is required.

#### Scenario: Relative URL
- **WHEN** the base URL is `https://example.test` and a step is `goto: /login`
- **THEN** the browser navigates to `https://example.test/login`

#### Scenario: Relative URL without base
- **WHEN** no base URL is configured and a step is `goto: /login`
- **THEN** the build fails before launching a browser and states that a base URL is required

### Requirement: Targets
A step that refers to a page element SHALL accept a target written as either a CSS selector string, or a mapping with `role` and optional `name`, or a mapping with `text`, or a mapping with `label`. A target SHALL resolve to exactly one element when the step runs.

#### Scenario: Role target
- **WHEN** a click step's target is `{role: button, name: Save}` and one such button exists
- **THEN** that button is clicked

#### Scenario: Target matches several elements
- **WHEN** a target matches more than one element
- **THEN** the step fails and the message states the number of matches and the target

#### Scenario: Invalid target shape
- **WHEN** a target mapping has none of `role`, `text`, or `label`
- **THEN** validation fails before launching a browser

### Requirement: Click and fill steps
`click` SHALL take a target and click the element. `fill` SHALL take a target and a `value`, and SHALL replace the element's contents with the value. Both SHALL wait for the element to be present and actionable, and SHALL fail when it is not within the timeout.

#### Scenario: Fill a field
- **WHEN** a fill step targets a text field with value `ada`
- **THEN** the field contains `ada` afterwards

#### Scenario: Missing element
- **WHEN** a click step's target never appears
- **THEN** the step fails after the timeout and names the target

### Requirement: Wait step
`wait` SHALL take one condition: a target to become `visible`, a target to become `hidden`, a `text` string to appear on the page, `network: idle`, or a number of milliseconds. The step SHALL complete when the condition holds and SHALL fail with a message naming the condition if it does not hold within the timeout.

#### Scenario: Wait for list to update
- **WHEN** a step waits for the text `2 items left` after a click
- **THEN** later steps run only after that text is on the page

#### Scenario: Condition never holds
- **WHEN** the awaited element never becomes visible
- **THEN** the step fails after the timeout and the message names the condition

### Requirement: Screenshot step syntax
`screenshot` SHALL take a mapping with a required `name` and optional `target`, `include`, `padding`, and `alt`. A `name` SHALL contain only letters, digits, hyphens, and underscores and SHALL be unique within the document. Without a `target` the viewport is captured.

#### Scenario: Name with invalid characters
- **WHEN** a screenshot is named `my shot/1`
- **THEN** validation fails and the message states which characters are allowed

#### Scenario: Missing name
- **WHEN** a screenshot step has no `name`
- **THEN** validation fails and names the step
