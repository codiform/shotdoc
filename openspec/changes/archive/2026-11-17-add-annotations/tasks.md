# Tasks

## 1. Syntax

- [x] 1.1 Add an `Annotation` type (kind `highlight`, `arrow` or `badge`; `target`; optional `color`; optional `from` for arrows) and `annotate: Annotation[]` (default empty) to the screenshot step type; parse `annotate` in `parseScreenshot` and add it to the allowed-keys message; verify parser tests for each kind with a bare target in each of the four forms, the `{target, color}` form, an arrow with each `from`, and that a screenshot with no `annotate` parses as before
- [x] 1.2 Reject malformed input with messages naming the item as `annotate[n]` and the kind: a non-list, an item with no key, two keys or an unknown kind, an invalid target, an unknown option, an empty or non-string `color`, `from` on a kind other than `arrow` or an arrow `from` that is not one of the four sides, and `annotate` without a `target`; verify a parser test for each, including that the message lists the kinds allowed

## 2. Drawing

- [x] 2.1 Add `src/run/annotate.ts` with a pure function that turns the parsed list into items to draw, numbering badges from 1 in listed order and applying the default colour and side; verify unit tests for numbering across mixed kinds, the default colour and side, and overrides
- [x] 2.2 In the same module, draw the items into one overlay host (shadow root, `all: initial`, absolute, zero size, `pointer-events: none`, maximum z-index) appended to `documentElement`, built with DOM calls and CSSOM only, returning each item's bounds in document coordinates (element rect plus scroll, with the outsets in the design) and a function that removes the host; add `test/fixtures/annotate.html` with known positions, a page whose stylesheet sets border, margin, font and box sizing on every element, and an element at the right edge; verify fixture tests for the pixels of a highlight (colour border with white rings, element pixels unchanged), an arrow from each side, a badge, the colour override, and that drawing on the global-CSS page matches drawing on the plain one; if the shadow root does not isolate, fall back to `all: initial` on each element and record it in the design
- [x] 2.3 Verify a fixture test on a page with a strict Content-Security-Policy `style-src` that the annotations still draw; verify that the layout is unchanged (every other element at the same position, image size unchanged for an annotation inside the target) and that the overlay takes no pointer events

## 3. Capture

- [x] 3.1 In `takeScreenshot`, wait for each annotation target to be visible and still using `waitUntilReady`, scrolling the screenshot's target into view first, and fail as `<kind> target <description>: <reason>` for a miss or several matches; check `color` with `CSS.supports('color', value)` and fail naming the annotation and colour; verify fixture tests for no match (message names the target and says arrow, badge or highlight), several matches (count and target), a late element, and an invalid colour leaving no image
- [x] 3.2 In `applyEffects`, measure the page size first, draw the overlay after hide and add its removal to `restore`; in `capture`, add the annotation bounds to the measured rectangles and clamp to the pre-overlay page size; verify fixture tests that an arrow outside the target is fully in the image and the image is larger than the target plus padding, a highlight on the target itself with padding 0 is fully in the image, an annotation inside the target leaves the size unchanged, a region taller than the viewport has its annotations where their elements are, an annotation overhanging the right edge is cut at the page edge, and a hidden element can be annotated
- [x] 3.3 Verify fixture tests that after an annotated screenshot the page holds nothing the annotations added, a later screenshot has no annotation, the same holds when the screenshot fails (a missing mask target), and a mask over an annotated element covers the annotation

## 4. Docs, example and checks

- [x] 4.1 Document `annotate` in the README: the steps table line, a section with an example, the three kinds with `from` and `color`, badge numbering, that the region grows to include annotations, that annotations last for one screenshot and need a `target`, and the known limits (fixed and sticky targets, page edges, fonts for badge digits); remove annotations from any "not yet supported" wording; verify the README test still validates every example and add a check that it documents `annotate` and its kinds
- [x] 4.2 Add a `highlight` to one screenshot in `examples/todomvc/input/todo-mvc.md` where it points at something natural (the new-todo input), without changing the example's prose, and rebuild from the project root against the live demo; verify the built image shows the highlight with its white ring, only that image changed, and the built Markdown is unchanged
- [x] 4.3 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `openspec validate add-annotations --strict`; verify they all pass, and walk each scenario in the spec deltas to confirm it has a test, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving adds four requirements to `screenshot-capture` and `block-language`'s "Annotation syntax", and replaces "Screenshot step syntax" (keeping its existing scenarios).
- Close GitHub issue #1 with the commit that lands this.
- Issue #16 (spike cleanup) stays blocked by #5; the spike's annotation code has then been harvested.
- Scoping beyond one screenshot is #18.
