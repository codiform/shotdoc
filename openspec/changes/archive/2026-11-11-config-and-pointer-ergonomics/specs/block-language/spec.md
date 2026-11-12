# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
