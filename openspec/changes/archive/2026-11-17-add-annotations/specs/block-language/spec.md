## MODIFIED Requirements

### Requirement: Screenshot step syntax
`screenshot` SHALL take a mapping with a required `name` and optional `target`, `include`, `padding`, `alt`, `hide`, `mask`, `maskColor`, and `annotate`. A `name` SHALL contain only letters, digits, hyphens, and underscores and SHALL be unique within the document. Without a `target` the viewport is captured. `hide` and `mask` SHALL each be a list of targets in any form a target accepts, `maskColor` SHALL be a non-empty string, and `annotate` SHALL be a list of annotations.

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

## ADDED Requirements

### Requirement: Annotation syntax
Each item of `annotate` SHALL be a mapping with exactly one key, `highlight`, `arrow`, or `badge`. Its value SHALL be a target in any form a target accepts, or a mapping with a `target` and optional `color` (a non-empty string); for `arrow` the mapping MAY also have `from`, one of `left`, `right`, `top`, or `bottom`. `annotate` SHALL require the screenshot to have a `target`.

#### Scenario: Annotations accepted
- **WHEN** a screenshot with a target has `annotate` listing `highlight: "#save"`, `arrow: {target: {role: button, name: Export}, from: right}`, and `badge: {target: {text: Delete}, color: "#0a0"}`
- **THEN** validation succeeds

#### Scenario: Item without exactly one kind
- **WHEN** an `annotate` item has no key, two keys, or a key other than `highlight`, `arrow`, or `badge`
- **THEN** validation fails before launching a browser and the message names the item's position and the kinds allowed

#### Scenario: Invalid annotation target
- **WHEN** an annotation's value is not a valid target
- **THEN** validation fails and the message names the kind and the item's position

#### Scenario: Unknown option or value
- **WHEN** an annotation mapping has an unknown key, an empty `color`, or an arrow `from` that is not one of the four sides
- **THEN** validation fails before launching a browser and the message names the annotation and the problem

#### Scenario: Option the kind does not take
- **WHEN** a `highlight` or `badge` mapping has `from`
- **THEN** validation fails before launching a browser and names the annotation

#### Scenario: Annotate without a target
- **WHEN** a screenshot has `annotate` and no `target`
- **THEN** validation fails before launching a browser and says `annotate` requires a `target`
