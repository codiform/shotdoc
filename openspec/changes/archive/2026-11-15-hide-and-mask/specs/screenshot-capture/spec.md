# Spec Delta

## ADDED Requirements

### Requirement: Hiding elements
Every element matched by a screenshot's `hide` targets SHALL be invisible in that image while keeping the space it occupies, so the rest of the page is laid out exactly as without the option. It SHALL apply to viewport and element screenshots and only to that screenshot: the page SHALL be restored afterwards.

#### Scenario: Hidden element leaves a gap
- **WHEN** a screenshot hides one of two adjacent elements
- **THEN** the hidden element's area shows the page background, and the other element is where it would have been without hiding

#### Scenario: Page restored
- **WHEN** a screenshot hides an element and a later screenshot of the same page has no `hide`
- **THEN** the element is visible in the later image

#### Scenario: Hide with an element screenshot
- **WHEN** an element screenshot hides an element inside the target
- **THEN** the image has the target's usual size and the hidden element's area is blank

### Requirement: Masking elements
Every element matched by a screenshot's `mask` targets SHALL be covered in that image by a solid block of one colour, a neutral grey unless `maskColor` is given. It SHALL apply to viewport and element screenshots, including a region larger than the viewport, and only to that screenshot.

#### Scenario: Masked region is solid
- **WHEN** a screenshot masks an element showing coloured text
- **THEN** the element's area in the image is the mask colour and nothing of the text shows

#### Scenario: Colour override
- **WHEN** the screenshot gives `maskColor: "#ff00ff"`
- **THEN** the masked area is that colour

#### Scenario: Colour the browser does not understand
- **WHEN** the screenshot gives `maskColor: "not-a-colour"`
- **THEN** the step fails naming the colour, and no image is kept

#### Scenario: Region larger than the viewport
- **WHEN** a screenshot of a region taller than the viewport masks an element below the first screen
- **THEN** that element's area in the image is the mask colour

#### Scenario: Page unchanged afterwards
- **WHEN** a screenshot masks an element and a later screenshot of the same page has no `mask`
- **THEN** the element appears normally in the later image

### Requirement: Hide and mask targets match at least one element
A `hide` or `mask` target SHALL match one or more elements, and every match SHALL be hidden or masked. The system SHALL wait for at least one match to be present. If none appears within the timeout, the step SHALL fail naming the target and whether it was a `hide` or a `mask` target, and no image SHALL be kept.

#### Scenario: Several matches
- **WHEN** a mask target matches the date cell in every row of a table
- **THEN** all the date cells are masked

#### Scenario: No match
- **WHEN** a mask target matches nothing before the timeout
- **THEN** the step fails after the timeout and the message names the target and says it was a mask target

#### Scenario: Late element
- **WHEN** a hide target's element appears shortly after the step starts
- **THEN** the step waits for it and hides it

### Requirement: Blank image hint when masking
When a screenshot with a `mask` fails the blank-image check, the message SHALL also say that a mask may be covering everything in the image.

#### Scenario: Mask covers the whole image
- **WHEN** an element is captured with padding 0 and the mask covers that element
- **THEN** the step fails as blank and the message mentions the mask
