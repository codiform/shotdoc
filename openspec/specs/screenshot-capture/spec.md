# screenshot-capture Specification

## Purpose

Defines how shotdoc produces plain, reliable documentation screenshots: viewport and element captures, padding, extra regions, predictable image sizes, waiting for the page to be ready, and stable rendering.

## Requirements

### Requirement: Viewport and element captures
A screenshot step without a target SHALL capture the current viewport. A screenshot step with a target SHALL capture the region of that element. Images SHALL be PNG.

#### Scenario: Viewport capture
- **WHEN** a screenshot step has no target and the viewport is 1280x800 at scale 2
- **THEN** the image is 2560x1600 pixels

#### Scenario: Element capture
- **WHEN** a screenshot step targets a card element with padding 0
- **THEN** the image shows only that element's area

### Requirement: Padding
An element capture SHALL add padding in CSS pixels on every side of the region, defaulting to 16 when not given, and SHALL limit the region to the page's bounds. A viewport capture SHALL ignore padding.

#### Scenario: Default padding
- **WHEN** an element screenshot gives no padding
- **THEN** the region extends 16 CSS pixels beyond the element on each side where the page has room

#### Scenario: Element at the page edge
- **WHEN** an element touches the top-left corner of the page and padding is 20
- **THEN** the region starts at the page edge and the capture succeeds

### Requirement: Extra regions
A screenshot step with a target MAY list further targets under `include`. The captured region SHALL be the smallest rectangle containing the target and every included element, plus padding.

#### Scenario: Header and open menu
- **WHEN** a screenshot targets a table header and includes the open menu below it
- **THEN** the image contains both the header and the whole menu

#### Scenario: Included target missing
- **WHEN** an included target does not match any element
- **THEN** the step fails and names the included target

### Requirement: Whole-pixel regions and predictable size
The captured region SHALL be rounded outward to whole CSS pixels, so that the image's pixel dimensions equal the region's whole-pixel dimensions multiplied by the device scale, whatever fractional size the element has.

#### Scenario: Fractional element size
- **WHEN** an element is 82.39 CSS pixels wide and padding is 16
- **THEN** the image width is a whole number of CSS pixels times the scale, at least 114.39 CSS pixels wide

### Requirement: Capture does not disturb the page
When the captured region fits within the viewport, possibly after scrolling it into view, the system SHALL capture it without changing the viewport size. Only when the region is larger than the viewport MAY the system capture beyond it.

#### Scenario: Page that re-renders on resize
- **WHEN** an element is captured on a page that redraws its content when the viewport changes size
- **THEN** the image shows the content as the author saw it, not a blank or redrawn state

#### Scenario: Element below the fold
- **WHEN** the target is below the visible area but smaller than the viewport
- **THEN** the system scrolls it into view and captures it

### Requirement: Capture waits for readiness
A screenshot SHALL NOT be taken until its target and every included element are visible and have stopped moving. Authors MAY use the wait step to wait for other conditions, such as changed text.

#### Scenario: Element still animating in
- **WHEN** the target slides into place when the page loads
- **THEN** the screenshot shows it in its final position

#### Scenario: Target never becomes visible
- **WHEN** the target stays hidden for the whole timeout
- **THEN** the step fails and names the target

### Requirement: Stable rendering
Every capture SHALL use the configured viewport size and device scale, a fixed locale of `en-US` and timezone of `UTC`, SHALL have CSS animations and transitions settled to their end state when the image is taken, and SHALL hide the text caret. Defaults SHALL be a 1280x800 viewport and a scale of 2.

#### Scenario: Defaults
- **WHEN** no viewport or scale is configured
- **THEN** viewport screenshots are 2560x1600 pixels

#### Scenario: Locale and timezone
- **WHEN** a page formats a date using the browser's locale and timezone
- **THEN** it renders using `en-US` and `UTC`

#### Scenario: Caret
- **WHEN** a text field has focus during a capture
- **THEN** no text caret appears in the image

### Requirement: Blank captures are rejected
A screenshot whose image is a single colour throughout SHALL fail its step, and no image SHALL be kept for it. The message SHALL name the screenshot and its target, say that the image is blank, and suggest waiting for the page to finish loading. The check SHALL apply to every screenshot, viewport or element.

#### Scenario: Page that has not rendered
- **WHEN** a viewport screenshot is taken of a page whose content is empty
- **THEN** the step fails and the message names the screenshot and says the image is blank

#### Scenario: Solid element without padding
- **WHEN** an element that is one solid colour is captured with padding 0
- **THEN** the step fails and the message names the screenshot and the target

#### Scenario: Same element with padding
- **WHEN** that element is captured with the default padding on a page whose background differs from it
- **THEN** the step succeeds, because the image contains more than one colour

#### Scenario: Page with content
- **WHEN** a screenshot of a page or element with several colours is taken
- **THEN** the step succeeds and the image is written

#### Scenario: No image kept
- **WHEN** a blank screenshot fails the build
- **THEN** no built document is written and the image is not among the output

### Requirement: Repeatable output
Building the same document twice on the same machine against pages whose content does not change SHALL produce byte-identical images, including for pages that use CSS animations and transitions.

#### Scenario: Two builds of one document
- **WHEN** a document with viewport and element screenshots of fixed pages is built twice
- **THEN** every image from the second build is byte-identical to the one from the first

#### Scenario: Endless CSS animation
- **WHEN** a page has a CSS animation that never ends and a CSS transition, and it is captured in two builds
- **THEN** the images from the two builds are byte-identical
