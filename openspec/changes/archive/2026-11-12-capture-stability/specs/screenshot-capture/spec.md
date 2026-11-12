# Spec Delta

## ADDED Requirements

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
