## ADDED Requirements

### Requirement: Annotations are drawn on the screenshot
Each item of a screenshot's `annotate` SHALL be drawn over the page in that image: `highlight` as a box around its element, `arrow` as an arrow beside it pointing at it from the chosen side (left by default), and `badge` as a numbered circle on its top-left corner, numbered from 1 in listed order. Each SHALL use the given `color` or a default, with a white outline. Drawing SHALL NOT change the page's layout or react to pointer input.

#### Scenario: Highlight box
- **WHEN** a screenshot highlights a button
- **THEN** the image shows a box in the annotation colour around the button, and the button's own pixels are unchanged

#### Scenario: Arrow from a side
- **WHEN** a screenshot has an arrow with `from: right` on an element
- **THEN** the arrow is drawn to the right of the element, pointing at it

#### Scenario: Badges are numbered in order
- **WHEN** a screenshot lists a highlight, then a badge on one element, then a badge on another
- **THEN** the first badge shows 1 and the second shows 2

#### Scenario: Colour override
- **WHEN** an annotation gives `color: "#0a0"`
- **THEN** it is drawn in that colour

#### Scenario: Layout unchanged
- **WHEN** a screenshot is annotated and the same screenshot is taken without annotations
- **THEN** every element is at the same position in both images

#### Scenario: Page with global styles
- **WHEN** the page's own stylesheet sets borders, margins, fonts, or box sizing on every element
- **THEN** the annotations are drawn as they are on a page with no such styles

#### Scenario: A mask covers an annotation
- **WHEN** a screenshot both masks an element and annotates it
- **THEN** the masked area is the mask colour and the annotation is not visible there

### Requirement: Capture region includes annotations
The captured region SHALL be the smallest rectangle containing the target, every included element, and every annotation as drawn, plus padding, limited to the page and rounded to whole CSS pixels. An annotation that falls outside the page SHALL be cut off at the page edge.

#### Scenario: Arrow outside the target
- **WHEN** a screenshot of a toolbar has an arrow pointing at one of its buttons from the left, and the arrow extends beyond the toolbar
- **THEN** the whole arrow is in the image and the image is larger than the toolbar plus padding

#### Scenario: Highlight at the edge of the target
- **WHEN** a screenshot highlights the target itself with padding 0
- **THEN** the whole highlight, including its outline, is in the image

#### Scenario: Annotation inside the target
- **WHEN** every annotation lies within the target
- **THEN** the image has the same size as without annotations

#### Scenario: Region larger than the viewport
- **WHEN** an annotated region is taller than the viewport
- **THEN** the annotations are in the image where their elements are

### Requirement: Annotation targets match exactly one element
An annotation target SHALL resolve to exactly one element. The system SHALL wait for it to be visible and still, as it does for the screenshot's target. If it does not, or it matches several elements, the step SHALL fail naming the annotation kind and the target, and no image SHALL be kept.

#### Scenario: No match
- **WHEN** an arrow's target matches nothing before the timeout
- **THEN** the step fails after the timeout and the message names the target and says it was an arrow target

#### Scenario: Several matches
- **WHEN** a badge's target matches three elements
- **THEN** the step fails and the message states the number of matches and the target

#### Scenario: Late element
- **WHEN** a highlight's element appears shortly after the step starts
- **THEN** the step waits for it and highlights it

### Requirement: Annotations last for one screenshot
Annotations SHALL appear only in the screenshot that lists them. Once that screenshot is taken, or fails, every annotation SHALL be removed from the page.

#### Scenario: Later screenshot is plain
- **WHEN** a screenshot is annotated and a later screenshot of the same page has no `annotate`
- **THEN** the later image shows no annotation and the page holds nothing the annotations added

#### Scenario: Failed screenshot
- **WHEN** an annotated screenshot fails, for example because a mask target is missing
- **THEN** the page holds nothing the annotations added
