# block-language Specification

## Purpose

Defines the syntax authors use inside fenced blocks to drive a browser: YAML steps, how steps refer to page elements, and how unsupported or future syntax is rejected.

## Requirements

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
A shotdoc block body SHALL be a YAML list in which each item is a mapping with exactly one key naming a step. The supported steps SHALL be `goto`, `click`, `dblclick`, `hover`, `unhover`, `fill`, `press`, `wait`, and `screenshot`. Invalid YAML, a non-list body, an item without exactly one key, or an unsupported step name SHALL fail validation naming the file, the block's line, and the step number where one applies.

#### Scenario: Valid block
- **WHEN** a block contains `- goto: /` followed by `- screenshot: {name: home}`
- **THEN** validation succeeds and the steps run in the order written

#### Scenario: Newly supported steps
- **WHEN** a block contains `hover`, `unhover`, `dblclick`, and `press` steps with valid arguments
- **THEN** validation succeeds

#### Scenario: Unsupported step name
- **WHEN** a block contains a step named `swipe`
- **THEN** validation fails and names the step number and the unsupported step

#### Scenario: Malformed YAML
- **WHEN** a block body is not valid YAML
- **THEN** validation fails and the message names the file and the block's line

### Requirement: Goto step
`goto` SHALL take a URL string. An absolute URL (one beginning with a scheme such as `https:`) SHALL be used as written. Any other value is a context path, resolved against the configured base URL treated as a directory: `/` is the base URL itself, and `/login`, `login`, and `./login` all go under the base URL's path, whether or not it ends in `/`. When a context path is used and no base URL is configured, validation SHALL fail and state that a base URL is required.

#### Scenario: Relative URL
- **WHEN** the base URL is `https://example.test` and a step is `goto: /login`
- **THEN** the browser navigates to `https://example.test/login`

#### Scenario: Relative URL without base
- **WHEN** no base URL is configured and a step is `goto: /login`
- **THEN** the build fails before launching a browser and states that a base URL is required

#### Scenario: Context root
- **WHEN** the base URL is `https://example.test/todos/` and a step is `goto: /`
- **THEN** the browser navigates to `https://example.test/todos/`

#### Scenario: Base URL path is kept
- **WHEN** the base URL is `https://example.test/todos/` and a step is `goto: /login`
- **THEN** the browser navigates to `https://example.test/todos/login`

#### Scenario: Base URL without trailing slash
- **WHEN** the base URL is `https://example.test/todos` and a step is `goto: /` or `goto: ./`
- **THEN** the browser navigates to `https://example.test/todos/`

#### Scenario: Absolute URL
- **WHEN** the base URL is `https://example.test/todos/` and a step is `goto: https://other.test/page`
- **THEN** the browser navigates to `https://other.test/page`

### Requirement: Targets
A step that refers to a page element SHALL accept a target written as either a selector string, or a mapping with `role` and optional `name`, or a mapping with `text`, or a mapping with `label`. A selector string SHALL use Playwright's selector syntax, which includes CSS and its extensions such as `:has-text()`, `:nth-child()`, and `>>` chaining. A target SHALL resolve to exactly one element when the step runs.

#### Scenario: Role target
- **WHEN** a click step's target is `{role: button, name: Save}` and one such button exists
- **THEN** that button is clicked

#### Scenario: Target matches several elements
- **WHEN** a target matches more than one element
- **THEN** the step fails and the message states the number of matches and the target

#### Scenario: Scoping one of several identical elements
- **WHEN** three rows each hold a checkbox with the same name and a click step's target is a selector that picks the checkbox in the row containing a given text
- **THEN** only that row's checkbox is clicked

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

### Requirement: Double-click and hover steps
`dblclick` and `hover` SHALL each take a target in any form `click` accepts. They SHALL wait for the element to be present and actionable and SHALL fail, naming the target, when it is not within the timeout. `dblclick` SHALL double-click the element. `hover` SHALL move the pointer over the element and leave it there until a later step moves the pointer.

#### Scenario: Double-click opens edit mode
- **WHEN** a dblclick step targets an item that switches to an edit field on double-click
- **THEN** the edit field is present afterwards

#### Scenario: Hover reveals a control
- **WHEN** a hover step targets a row whose delete control is visible only while the row is hovered, then a screenshot of the control follows
- **THEN** the control is visible in the image

#### Scenario: Hover persists across steps
- **WHEN** a hover step is followed by steps that do not move the pointer
- **THEN** the hovered element is still hovered at the later screenshot

#### Scenario: Missing element
- **WHEN** a hover or dblclick step's target never appears
- **THEN** the step fails after the timeout and names the target

### Requirement: Unhover step
`unhover` SHALL take no value and SHALL move the pointer to the top-left corner of the page, ending any hover the previous steps left in effect. A value of any kind SHALL fail validation naming the step.

#### Scenario: Hover effect ends
- **WHEN** a hover step shows a control that appears only on hover, then an `unhover` step runs, then a screenshot of the same area follows
- **THEN** the control is not visible in the image

#### Scenario: Unhover across blocks
- **WHEN** a hover step is in one block and an `unhover` step starts the next block
- **THEN** the hover is no longer in effect for the steps after it

#### Scenario: Value given
- **WHEN** a step is `unhover: body`
- **THEN** validation fails before launching a browser and names the step

### Requirement: Press step
`press` SHALL take a key, written either as a string or as a mapping with `key` and an optional `target`. A key is a single character or a key name such as `Enter`, `Escape`, or `Tab`, optionally combined with modifiers using `+`, as in `Control+A`. Without a target the key SHALL be pressed on the focused element; with a target that element SHALL be focused first, waiting until it is actionable.

#### Scenario: Submit after fill
- **WHEN** a fill step types an item into an input and a `press: Enter` step follows
- **THEN** the page receives Enter on that input

#### Scenario: Press on a target
- **WHEN** a step is `press: {key: Escape, target: "#edit"}`
- **THEN** the element is focused and receives Escape

#### Scenario: Key with modifier
- **WHEN** a step is `press: Control+A`
- **THEN** the page receives A with Control held

#### Scenario: Malformed press step
- **WHEN** a press step has no key, a key that is not text, or an unknown mapping key
- **THEN** validation fails before launching a browser and names the step

#### Scenario: Unknown key name
- **WHEN** the key names a key that does not exist
- **THEN** the step fails and the message names the key

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
