# Spec Delta

## ADDED Requirements

### Requirement: Trimming the target
A screenshot's `trim` SHALL move each named side of the target's area inward by the given amount before the captured region is worked out. A number is CSS pixels. A percentage is of the target's width for `left` and `right`, and of its height for `top` and `bottom`. Sides not named are not moved.

#### Scenario: Pixels from one side
- **WHEN** a 600x200 target is captured with `trim: {right: 400}` and padding 0
- **THEN** the image shows the target's leftmost 200 CSS pixels at its full height

#### Scenario: Percentage
- **WHEN** a 600x200 target is captured with `trim: {right: "60%"}` and padding 0
- **THEN** the image is 240 CSS pixels wide

#### Scenario: Several sides and mixed units
- **WHEN** a 600x200 target is captured with `trim: {left: 100, right: "50%", top: "25%"}` and padding 0
- **THEN** the image shows the area from 100 to 300 CSS pixels across and 50 to 200 down

#### Scenario: Target larger than the viewport
- **WHEN** a target is wider than the viewport and what remains after trimming fits within it
- **THEN** the remaining area is captured without changing the viewport size

### Requirement: Trimming keeps included elements and annotations
`trim` SHALL cut only the target. Every included element and every annotation SHALL still be wholly in the image, even where it lies in the trimmed area, and `padding` SHALL be added around the result as for any element capture.

#### Scenario: Popup reaching past the cut
- **WHEN** the target is trimmed from the right and an included popup extends into the trimmed area
- **THEN** the image extends to the popup's right edge, plus padding

#### Scenario: Annotation in the trimmed area
- **WHEN** a screenshot annotates an element that lies in the trimmed area
- **THEN** the image grows to contain the whole annotation

#### Scenario: Padding on a trimmed side
- **WHEN** a screenshot trims the right side and padding is 16
- **THEN** the image extends 16 CSS pixels to the right of the cut

### Requirement: A trim must leave part of the target
When the trim would leave the target no width or no height, the step SHALL fail, naming the screenshot and the target's size. When what is left of the target is wholly off the page, the step SHALL fail, naming the screenshot and the target. In either case no image SHALL be kept.

#### Scenario: Trim wider than the target
- **WHEN** a 600 CSS pixel wide target is captured with `trim: {right: 700}`
- **THEN** the step fails, the message says the trim leaves nothing of the target, and no image is written

#### Scenario: Opposite sides overlap
- **WHEN** a screenshot has `trim: {top: "60%", bottom: "50%"}`
- **THEN** the step fails in the same way

#### Scenario: Only an off-page part is left
- **WHEN** a target hangs off the left edge of the page and the trim leaves only the part that is off it
- **THEN** the step fails, the message says the trim leaves none of the target on the page, and no image is written, whatever the padding

## MODIFIED Requirements

### Requirement: Extra regions
A screenshot step with a target MAY list further targets under `include`. The captured region SHALL be the smallest rectangle containing the target (as trimmed, when the screenshot has `trim`) and every included element, plus padding.

#### Scenario: Header and open menu
- **WHEN** a screenshot targets a table header and includes the open menu below it
- **THEN** the image contains both the header and the whole menu

#### Scenario: Included target missing
- **WHEN** an included target does not match any element
- **THEN** the step fails and names the included target

### Requirement: Capture region includes annotations
The captured region SHALL be the smallest rectangle containing the target (as trimmed, when the screenshot has `trim`), every included element, and every annotation as drawn, plus padding, limited to the page and rounded to whole CSS pixels. An annotation that falls outside the page SHALL be cut off at the page edge.

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
