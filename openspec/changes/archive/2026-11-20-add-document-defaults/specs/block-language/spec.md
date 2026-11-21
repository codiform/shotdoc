# Spec Delta

## ADDED Requirements

### Requirement: Document front matter
A source document MAY begin with a YAML front-matter block: a line of exactly `---` as the first line of the file, closed by a line of `---` or `...`. shotdoc SHALL read only the `shotdoc` key, which SHALL be a mapping whose only known key is `defaults`; other front-matter keys SHALL be ignored. Front matter that is not valid YAML, or a `shotdoc` that is not a mapping, or an unknown key under it, SHALL fail validation.

#### Scenario: No front matter
- **WHEN** a document does not start with `---`
- **THEN** it is parsed as before, with no defaults

#### Scenario: Other keys ignored
- **WHEN** the front matter has `title: Guide` and a valid `shotdoc` key
- **THEN** validation succeeds and `title` plays no part

#### Scenario: Invalid YAML
- **WHEN** the front matter is not valid YAML
- **THEN** validation fails before launching a browser and the message says the front matter is invalid

#### Scenario: Unknown shotdoc key
- **WHEN** the front matter has `shotdoc: {defalts: {}}`
- **THEN** validation fails and the message names the key and lists the known keys

#### Scenario: Rule later in the document
- **WHEN** a line of `---` appears after the first line and the document has no front matter
- **THEN** it is an ordinary thematic break and no front matter is read

#### Scenario: Block line numbers
- **WHEN** a shotdoc block follows a five-line front-matter block
- **THEN** errors in that block report its line in the whole file, front matter included

### Requirement: Document defaults syntax
`shotdoc.defaults` SHALL be a mapping with optional `hide` and `mask`, each a list of targets in any form a target accepts, and optional `maskColor`, a non-empty string. Any other key, including `annotate`, SHALL fail validation before a browser is launched; for `annotate` the message SHALL say annotations are set on each screenshot.

#### Scenario: Valid defaults
- **WHEN** the front matter has `shotdoc: {defaults: {hide: [{text: Demo}], mask: ["#avatar"], maskColor: "#333"}}`
- **THEN** validation succeeds

#### Scenario: Not a list
- **WHEN** `defaults.hide` is a single target rather than a list
- **THEN** validation fails and the message says the key must be a list of targets

#### Scenario: Invalid target
- **WHEN** an item in `defaults.mask` is not a valid target
- **THEN** validation fails and the message names `defaults.mask` and the item's position

#### Scenario: Annotate in defaults
- **WHEN** `defaults` has an `annotate` key
- **THEN** validation fails and the message says annotations are set on each screenshot

#### Scenario: Invalid colour value
- **WHEN** `defaults.maskColor` is empty or not a string
- **THEN** validation fails before launching a browser

### Requirement: Opting a screenshot out of defaults
`screenshot` SHALL accept an optional `defaults` key that is a boolean. `false` SHALL mean none of the document's defaults apply to that screenshot; `true` is the same as omitting it. Any other value SHALL fail validation.

#### Scenario: Opt out accepted
- **WHEN** a screenshot has `defaults: false`
- **THEN** validation succeeds

#### Scenario: Not a boolean
- **WHEN** a screenshot has `defaults: none`
- **THEN** validation fails and names the step and the key

## MODIFIED Requirements

### Requirement: Screenshot step syntax
`screenshot` SHALL take a mapping with a required `name` and optional `target`, `include`, `padding`, `alt`, `hide`, `mask`, `maskColor`, `annotate`, and `defaults`. A `name` SHALL contain only letters, digits, hyphens, and underscores and SHALL be unique within the document. Without a `target` the viewport is captured. `hide` and `mask` SHALL each be a list of targets in any form a target accepts, `maskColor` SHALL be a non-empty string, `annotate` SHALL be a list of annotations, and `defaults` SHALL be a boolean.

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
