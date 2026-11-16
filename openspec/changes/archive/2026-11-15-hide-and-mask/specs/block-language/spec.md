# Spec Delta

## MODIFIED Requirements

### Requirement: Screenshot step syntax
`screenshot` SHALL take a mapping with a required `name` and optional `target`, `include`, `padding`, `alt`, `hide`, `mask`, and `maskColor`. A `name` SHALL contain only letters, digits, hyphens, and underscores and SHALL be unique within the document. Without a `target` the viewport is captured. `hide` and `mask` SHALL each be a list of targets in any form a target accepts, and `maskColor` SHALL be a non-empty string.

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
