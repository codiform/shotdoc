# Spec Delta

## ADDED Requirements

### Requirement: Document defaults apply to every screenshot
For every screenshot, the elements matched by the document's default `hide` and `mask` targets SHALL be hidden and masked exactly as if listed in the screenshot's own `hide` and `mask`, in addition to them. The default `maskColor` SHALL be used unless the screenshot gives its own `maskColor`. Defaults SHALL NOT apply to a screenshot with `defaults: false`, and SHALL last only for that screenshot, like its own lists.

#### Scenario: Default hide on every shot
- **WHEN** the document's defaults hide an element and two screenshots each show it
- **THEN** the element is hidden in both images and visible again on the page afterwards

#### Scenario: Own list adds to defaults
- **WHEN** the defaults hide one element and a screenshot's own `hide` lists another
- **THEN** both are hidden in that image and only the first is hidden in the next screenshot

#### Scenario: Own mask colour wins
- **WHEN** the defaults give `maskColor: "#333"` and a screenshot gives `maskColor: "#ff00ff"`
- **THEN** that screenshot's masked areas are `#ff00ff` and other screenshots' are `#333`

#### Scenario: Opted out
- **WHEN** a screenshot has `defaults: false`
- **THEN** none of the default targets are hidden or masked in its image

### Requirement: Default targets need not match
A default `hide` or `mask` target that matches nothing, or matches only elements outside the captured region, SHALL NOT fail the screenshot. The system SHALL NOT wait for a default target: it SHALL apply the default to whatever matches when the capture is made.

#### Scenario: Nothing matches
- **WHEN** a default mask target matches no element on the page being captured
- **THEN** the image is taken, without waiting for the timeout, and nothing is masked

#### Scenario: Outside the region
- **WHEN** a default mask target matches an element that lies outside the captured region
- **THEN** the image is taken and is the same as without that default

#### Scenario: Present on some pages only
- **WHEN** a default hide target exists on one page of the document and not on another
- **THEN** screenshots of the first hide it and screenshots of the second succeed

## MODIFIED Requirements

### Requirement: Hide and mask targets match at least one element
A target in a screenshot's own `hide` or `mask` list SHALL match one or more elements, and every match SHALL be hidden or masked. The system SHALL wait for at least one match to be present. If none appears within the timeout, the step SHALL fail naming the target and whether it was a `hide` or a `mask` target, and no image SHALL be kept. Document defaults are exempt from this rule.

#### Scenario: Several matches
- **WHEN** a mask target matches the date cell in every row of a table
- **THEN** all the date cells are masked

#### Scenario: No match
- **WHEN** a mask target matches nothing before the timeout
- **THEN** the step fails after the timeout and the message names the target and says it was a mask target

#### Scenario: Late element
- **WHEN** a hide target's element appears shortly after the step starts
- **THEN** the step waits for it and hides it

#### Scenario: Own target still strict when defaults exist
- **WHEN** a screenshot's own mask target matches nothing and the document also has defaults
- **THEN** the step fails as for any other missing own target

### Requirement: Blank image hint when masking
When a screenshot with a mask, whether its own or a document default, fails the blank-image check, the message SHALL also say that a mask may be covering everything in the image.

#### Scenario: Mask covers the whole image
- **WHEN** an element is captured with padding 0 and the mask covers that element
- **THEN** the step fails as blank and the message mentions the mask

#### Scenario: Default mask covers the whole image
- **WHEN** an element is captured with padding 0 and a default mask covers that element
- **THEN** the step fails as blank and the message mentions the mask
