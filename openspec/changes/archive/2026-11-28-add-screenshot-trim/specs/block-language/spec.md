# Spec Delta

## ADDED Requirements

### Requirement: Trim syntax
`trim` SHALL be a mapping with at least one of `top`, `right`, `bottom`, and `left` and no other key. Each value SHALL be a non-negative number, or a percentage written as a number followed by `%` that is less than 100. `trim` SHALL require the screenshot to have a `target`.

#### Scenario: Pixels and percentages accepted
- **WHEN** a screenshot with a target has `trim: {right: 60%, top: 40}`
- **THEN** validation succeeds

#### Scenario: Not a mapping, empty, or unknown side
- **WHEN** `trim` is `400`, `{}`, or `{width: 400}`
- **THEN** validation fails before launching a browser and the message lists the sides allowed

#### Scenario: Invalid amount
- **WHEN** a side is `-5`, `"40px"`, `"100%"`, or `"-10%"`
- **THEN** validation fails before launching a browser and the message names the side and the forms allowed

#### Scenario: Trim without a target
- **WHEN** a screenshot has `trim` and no `target`
- **THEN** validation fails before launching a browser and says `trim` requires a `target`

## MODIFIED Requirements

### Requirement: Screenshot step syntax
`screenshot` SHALL take a mapping with a required `name` and optional `target`, `include`, `trim`, `padding`, `alt`, `hide`, `mask`, `maskColor`, `annotate`, and `defaults`. A `name` SHALL contain only letters, digits, hyphens, and underscores and SHALL be unique within the document. Without a `target` the viewport is captured. `hide` and `mask` SHALL each be a list of targets in any form a target accepts, `maskColor` SHALL be a non-empty string, `annotate` SHALL be a list of annotations, and `defaults` SHALL be a boolean.

#### Scenario: Name with invalid characters
- **WHEN** a screenshot is named `my shot/1`
- **THEN** validation fails and the message states which characters are allowed

#### Scenario: Missing name
- **WHEN** a screenshot step has no `name`
- **THEN** validation fails and names the step

#### Scenario: Hide and mask accepted
- **WHEN** a screenshot has `hide: ["#date"]`, `mask: [{role: img, name: Avatar}]`, and `maskColor: "#333"`
- **THEN** validation succeeds

#### Scenario: Hide or mask is not a list
- **WHEN** a screenshot has `mask: "#avatar"` or `hide: {text: Today}`
- **THEN** validation fails before launching a browser and the message says the key must be a list of targets

#### Scenario: Invalid hide or mask target
- **WHEN** a `hide` or `mask` list holds an item that is not a valid target
- **THEN** validation fails and the message names the key and the item's position

#### Scenario: Invalid mask colour
- **WHEN** `maskColor` is empty or is not a string
- **THEN** validation fails before launching a browser and names the step

#### Scenario: Annotate is not a list
- **WHEN** a screenshot has `annotate: {highlight: "#save"}`
- **THEN** validation fails before launching a browser and the message says `annotate` must be a list
