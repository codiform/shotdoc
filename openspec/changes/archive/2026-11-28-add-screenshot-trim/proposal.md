# Proposal

## Why

An element screenshot can only grow beyond its target: `padding` adds space and `include` adds elements. When the useful part of a large target is only one side of it, such as a row menu near the left edge of a wide grid, the image carries a lot of irrelevant content. Building the region from smaller pieces with `include` needs many selectors, which is impractical on pages without good ids or names (GitHub issue #32).

## What Changes

- New screenshot option `trim`, cutting space from any of the target's `top`, `right`, `bottom` and `left` sides.
- Each amount is CSS pixels (`400`) or a percentage of the target's width or height (`"60%"`).
- The cut applies to the target only. Included elements and annotations are still wholly in the image, and `padding` is added around the result, as today.
- A trim that leaves nothing of the target fails the step.
- `trim` requires a `target`, like `include` and `annotate`.
- The README documents the option.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `screenshot-capture`: adds trimming of the target, and states that the captured region is built from the trimmed target.
- `block-language`: `trim` is an accepted screenshot option, with its validation rules.

## Impact

- Step parsing and types (`src/parse/steps.ts`, `src/parse/types.ts`).
- Capture region (`src/run/region.ts`, `src/run/capture.ts`).
- README, tests and one test fixture.
- No new dependencies. Documents without `trim` produce the same images as before.
