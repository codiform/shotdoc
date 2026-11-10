# Spec Delta

## MODIFIED Requirements

### Requirement: YAML step lists
A shotdoc block body SHALL be a YAML list in which each item is a mapping with exactly one key naming a step. The supported steps SHALL be `goto`, `click`, `dblclick`, `hover`, `fill`, `press`, `wait`, and `screenshot`. Invalid YAML, a non-list body, an item without exactly one key, or an unsupported step name SHALL fail validation naming the file, the block's line, and the step number where one applies.

#### Scenario: Valid block
- **WHEN** a block contains `- goto: /` followed by `- screenshot: {name: home}`
- **THEN** validation succeeds and the steps run in the order written

#### Scenario: Newly supported steps
- **WHEN** a block contains `hover`, `dblclick`, and `press` steps with valid arguments
- **THEN** validation succeeds

#### Scenario: Unsupported step name
- **WHEN** a block contains a step named `swipe`
- **THEN** validation fails and names the step number and the unsupported step

#### Scenario: Malformed YAML
- **WHEN** a block body is not valid YAML
- **THEN** validation fails and the message names the file and the block's line

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

## ADDED Requirements

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
