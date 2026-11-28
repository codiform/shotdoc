# Design

## Context

`capture.ts` measures the target and each included element, then `region()` takes the union of those boxes and the annotation bounds, adds padding, limits the result to the page and rounds outward to whole pixels. Capture is viewport-first and re-measures after scrolling, with a separate path for regions larger than the viewport.

## Goals / Non-Goals

**Goals:** trim as a change to one input of `region()`, so everything after it behaves as it does now.

**Non-Goals:** cutting included elements, annotations or viewport captures; per-side `padding`; clipping to another element's edge; trim as a document default.

## Decisions

**Name the option `trim`, not `crop`.** `crop: {right: 60%}` can be read as "keep the right 60%". `trim` only reads as removal.

**Trim the target's box, before the union.** The alternative, cutting the finished image, would silently slice through a popup or arrow. As a consequence, an include or a highlight as large as the target restores the full size; the README says so.

**Padding applies to trimmed sides too.** `padding` keeps one meaning: space around the region. Up to that many pixels of trimmed content show past a cut; an author who minds trims that much more. The alternative, no padding on a trimmed side, would make `padding` depend on `trim` and on what else is in the region.

**Percentages are of the target's measured box**, not of the padded region or the part on the page. It is the one size that does not depend on other options.

**Parse amounts once.** The parser turns each side into pixels or a percentage, so capture does not interpret strings. A pure function in `region.ts` applies them to a box and is unit-tested.

**"Nothing left" is checked at capture time**, for pixels and percentages alike, since pixel amounts can only be judged against the measured box. It is checked even when an include would give the region some area, because it almost certainly means the amount is wrong. The check applies on both capture paths.

**No change to the blank check.** It runs on the final image, so a trim that leaves only solid colour fails as any blank screenshot does.

## Risks / Trade-offs

- Pixel amounts depend on the viewport and layout, so a redesign can shift what is cut without any error → percentages are available, and a trim that removes everything fails loudly.
- Finding the right amount takes trial and error → the README suggests browser developer tools for the target's size.
