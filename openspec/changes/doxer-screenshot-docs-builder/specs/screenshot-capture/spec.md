# Spec Delta

## Purpose

Defines how doxer produces documentation-quality, reproducible images: cropping, annotation, masking, and stable rendering.

## ADDED Requirements

### Requirement: Full-page and element screenshots
The system SHALL capture either the viewport, the full page, or a single element identified by a locator, and SHALL support padding around an element capture.

#### Scenario: Element crop with padding
- **WHEN** a screenshot step names a locator and a padding of 12px
- **THEN** the image contains that element plus 12px of surrounding page on each side, clamped to the page bounds

#### Scenario: Locator matches nothing
- **WHEN** an element screenshot's locator matches no element
- **THEN** the step fails and no image is written

### Requirement: Highlight annotation
The system SHALL support highlighting an element identified by a locator, drawing a visible outline around it that is positioned from the element's rendered bounds at capture time and appears in subsequent screenshots until removed.

#### Scenario: Highlight a button
- **WHEN** a block highlights a button and then takes a screenshot
- **THEN** the image shows a visible outline around the button

#### Scenario: Annotation follows layout
- **WHEN** the same highlight step is run with a different viewport width
- **THEN** the outline surrounds the element at its new position

### Requirement: Arrow and badge annotations
The system SHALL support an arrow pointing at an element from a stated direction, and a numbered badge attached to an element. Both SHALL be positioned from the element's rendered bounds at capture time.

#### Scenario: Arrow from the left
- **WHEN** a block adds an arrow to an element from the left and takes a screenshot
- **THEN** the image shows an arrow to the left of the element pointing at it

### Requirement: Annotations are removable and scoped
Annotations SHALL NOT alter the page's layout, and the system SHALL remove them when a step clears them or when a new session begins.

#### Scenario: Clear annotations
- **WHEN** a block clears annotations and takes another screenshot
- **THEN** the second image contains no annotations

### Requirement: Hiding and masking dynamic content
The system SHALL support hiding elements by locator and masking elements by locator with a solid fill, so that volatile content does not appear in images.

#### Scenario: Mask a timestamp
- **WHEN** a block masks the element showing the current time and takes a screenshot
- **THEN** the region of that element is filled with a solid colour in the image

### Requirement: Stable rendering
The system SHALL capture with a configured fixed viewport size and device scale factor, SHALL disable CSS animations and transitions, and SHALL hide the text caret.

#### Scenario: Configured viewport
- **WHEN** a viewport of 1280x800 at scale factor 2 is configured
- **THEN** viewport screenshots are 2560x1600 pixels

#### Scenario: Animated element
- **WHEN** a page element animates on load
- **THEN** the screenshot shows it in its final state

### Requirement: Deterministic output
For unchanged source, unchanged site content, and masked or hidden dynamic regions, two consecutive builds SHALL produce visually identical images.

#### Scenario: Two runs compared
- **WHEN** a document covering a page with masked dynamic regions is built twice
- **THEN** each pair of corresponding images shows no visible difference
