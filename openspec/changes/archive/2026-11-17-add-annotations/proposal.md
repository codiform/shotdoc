# Proposal

## Why

Documentation screenshots often need to point at something: "click this button", "the three parts of this toolbar" (GitHub issue #1). Today an author can only choose what to capture, not draw attention within it. The spike (archived `spike-screenshot-quality`) showed that drawing a highlight box, an arrow and numbered badges as page overlay works, leaves the page layout untouched, and gives byte-identical output between runs on one machine, but only if the capture region grows to include the annotations. A plain element crop contained none of them.

The earlier design made annotations persist across screenshots until cleared by a step. This change keeps them to one screenshot, as `hide` and `mask` are, so nothing carries over. Document-wide defaults and standing effects are tracked separately in #18.

## What Changes

- The `screenshot` step gains an `annotate` list. Each item is a single-key mapping naming the kind:
  - `highlight`: a box around the element.
  - `arrow`: an arrow pointing at the element from one side (`left` by default, or `right`, `top`, `bottom`).
  - `badge`: a numbered circle on the element's top-left corner, numbered 1, 2, 3 in the order the badges are listed.
- Each annotation takes a target in any existing form, or a mapping with `target` and options: `color` for all kinds, `from` for an arrow. The default colour is a saturated pink, and every annotation has a white outline so it shows on light and dark pages.
- An annotation target must match exactly one element, like other targets. shotdoc waits for it to be visible and still, and fails naming the kind and the target otherwise.
- The captured region becomes the smallest rectangle containing the target, any `include` targets and every annotation, plus padding, so an arrow or highlight outside the target is not cropped away.
- Annotations are drawn only for that one screenshot and removed afterwards. They do not change the layout, receive no pointer events, and can be placed over a `hide`; a `mask` is painted over them.
- `annotate` requires a `target`, like `include`.
- The README documents the option. The TodoMVC example uses a highlight on one screenshot, without changing its prose.

## Out of scope

- Text labels. A numbered badge plus a sentence in the surrounding prose is the intended way to name a part.
- Spotlight (dimming everything but the target), magnifier, ellipse, line and freehand drawing. A tighter screenshot of the element does most of what spotlight and magnifier do.
- Persisting annotations across screenshots, a clear step, a document-wide default colour, and explicit badge numbers. Scoping is tracked in #18; badge numbers are the position in the list, so an explicit override can be added later.
- Per-side padding or an inset, which #1 raised. The union region and `include` cover the cases it was meant for.
- Annotations on a viewport screenshot (one without a `target`), where an annotated element outside the visible area would be silently left out.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `block-language`: the screenshot step accepts `annotate`, with the annotation forms, and rejects malformed values before launching a browser.
- `screenshot-capture`: requirements are added for drawing annotations, the capture region including them, annotation targets, and their effect lasting for one screenshot.

## Impact

- **Code:** screenshot parsing in `src/parse/steps.ts` and the step type in `src/parse/types.ts`; a new overlay module under `src/run/` and its use from `src/run/capture.ts` (inject before the capture, add the annotation bounds to the measured rectangles, remove afterwards).
- **Tests:** parser tests for each form and each bad input; fixture tests through the runner for pixels of each annotation, the region growing to include an arrow outside the target, layout unchanged, removal afterwards, a page with aggressive global CSS, a mask over an annotation, and each failure.
- **Docs:** the README screenshots section, the steps table line and the known-limits list.
- **Example:** `examples/todomvc/input/todo-mvc.md` (a `highlight` on one screenshot) and its built image.
- **Dependencies:** none.
- **Compatibility:** purely additive. The unknown-key message for `screenshot` lists `annotate` as allowed.
- **Roadmap:** completes the last `screenshot-capture` piece of the superseded `doxer-screenshot-docs-builder` change and closes #1. #16 stays blocked by #5.
