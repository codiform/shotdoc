# Design

## Context

See proposal.md for motivation. Capture lives in `src/run/capture.ts`: `takeScreenshot` has three paths (viewport with no target, an element region that fits the viewport, a larger region captured with `fullPage: true` and a clip), all through `page.screenshot` with shared options (`SHOT_OPTS`). Targets are resolved with `locate()` in `src/run/targets.ts`, and the existing `explain()` turns Playwright's strict-mode error ("resolved to N elements") into "must match exactly one", which does not apply to hide and mask. Screenshot keys are validated in `parseScreenshot` in `src/parse/steps.ts`, which rejects unknown keys.

What the spike recorded (archived `spike-screenshot-quality`, finding 3): masking a live Grafana panel's content made two runs identical (0 differing pixels against about 190,000), with `#555555` as the colour, but the rectangle covered the panel's rounded corners and the image no longer showed the feature. That is why freezing data is separate and out of scope.

**What Playwright's `mask` does.** I checked it with a probe (a 400x300 page, scale 1) before writing this design:

| Case | Result |
| --- | --- |
| A mask locator matching two elements | both painted the mask colour |
| A clip within the viewport | masked area correct, image the clip's size |
| `fullPage: true` with a clip below the first screen and a mask there | masked area correct, image the clip's size |
| `visibility: hidden` on an element | the area shows the page background; the layout did not move |
| A mask over an element that is `visibility: hidden` | still painted |
| A mask locator matching nothing | no error, nothing painted |
| A mask over a `display: none` element | no error |

So `mask` needs no coordinate work from us, handles several matches, and works in all three capture paths. The case it does not cover is the last-but-one: a locator that matches nothing is silent, which is why shotdoc checks for a match itself.

## Goals / Non-Goals

**Goals:**
- Leave volatile or private elements out of one screenshot, without changing the rest of the page's layout.
- A selector that stops matching is a failure, not a quiet leak of the data.
- The effect lasts for one capture; later screenshots see the page as it was.

**Non-Goals:**
- Freezing data (recording and replaying responses), document-wide defaults, other obscuring effects; see the proposal.

## Decisions

### Options on the screenshot, not steps
`hide`, `mask` and `maskColor` are keys on `screenshot`. The old design had `hide` and `mask` steps that stayed in effect until cleared, which needs an undo step and a rule for when the effect ends, and lets a hidden element leak into later screenshots in a one-session document. A key lasts for exactly one capture and the page is restored, so there is nothing to clear and no state to reason about. The cost is that an author who wants the same elements hidden in several screenshots repeats the list. A document-wide default could be added later; it is not needed now.

*Alternative considered:* separate `hide`, `mask` and `show` steps (rejected for the leakage above).

### Hide with `visibility: hidden`, applied only for the capture
For each hide target, set `visibility: hidden !important` on every matched element, take the screenshot, then restore each element's previous inline `visibility` value and priority. The previous values are kept in a list in the page (not as attributes on the elements, which page code could see and which a stylesheet could match). `visibility` keeps the element's box, so nothing around it moves and measuring the region is unaffected.

A consequence: hiding a full-width element such as a banner leaves an empty band of the same size where it was. The TodoMVC example accepts this for its demo bar (a 45-pixel band of page background above the title). There is no "remove from layout" option; one could be added later if it comes up often.

*Alternatives considered:* `display: none` (rejected: it removes the element's space and moves the rest of the page); `opacity: 0` (rejected: it can be overridden by transitions on the element, and `visibility` is the more direct statement); a `<style>` rule built from the selector (rejected: role, text and label targets have no CSS form).

### Mask with Playwright's `mask` option
Pass the matched locators and the colour to `page.screenshot` (`mask` and `maskColor`). It paints a box over each match in the taken image and removes it afterwards, so it needs no page cleanup, and the probe showed it correct in all three capture paths. The default colour is `#555555`, the one the spike found worked.

*Alternative considered:* overlaying our own absolutely positioned boxes (rejected: it duplicates what `mask` already does and needs the cleanup and coordinate handling that annotations will need anyway; if annotations make a shared overlay available later, masks could move onto it).

### At least one match, waited for
Before the capture, for each hide or mask target, wait for at least one element to be attached (the same timeout as other targets), then apply it to all matches. If none appears, fail with the target and whether it was a `hide` or a `mask` target, as other target failures do. The check is about presence, not visibility: a mask over an element that is not visible is harmless, and a hide target already hidden by the page is simply a no-op.

The hide and mask targets are resolved after the screenshot's own target has been waited for and before the region is measured. Hiding cannot change geometry, and `mask` is applied by the screenshot call itself, so measurement is unaffected.

*Alternative considered:* allowing zero matches (rejected: a selector that stops matching after a page change would silently leave the data in the image, which is the failure the feature exists to prevent).

### Colour is validated in the browser
`maskColor` is any non-empty string in the parser. Playwright passes it to the page as a CSS colour, and a value the browser does not understand would paint nothing, which is a silent leak. Before the capture, check it with `CSS.supports('color', value)` in the page and fail the step, naming the colour, if it is not accepted. This keeps the parser free of a CSS colour grammar.

### Where the blank hint goes
`save()` in `src/run/capture.ts` builds the blank-image message. It takes a flag for "this screenshot had a mask" and appends a sentence saying the mask may cover everything in the image. The blank rule itself is unchanged.

### Errors
`explain()`'s "must match exactly one" message is for single targets. Hide and mask targets skip that path and use their own failure, so authors never see a "matched 3 elements but must match exactly one" error for a target that is allowed to match many.

## Risks / Trade-offs

- **A masked or hidden region can change a region's apparent content but not its size**: this is by design; a document that masks a long list leaves the same-size image.
- **`visibility: hidden` can be overridden by a page's own `!important` rules or by script that rewrites the style**: we set it with `!important` on the inline style, which wins over stylesheet rules. Script that reapplies styles mid-capture is not handled.
- **Playwright's mask works on the page it is taken from**: content inside iframes is covered only as far as Playwright covers it by default; this is not tested here.
- **A mask on a very large element still paints one block**: the image then holds a single big block. That is the author's choice, and the blank check plus its hint catches the case where it is the whole image.

## Open Questions

None blocking. The TodoMVC example repeats the same `hide` list on nine screenshots, which is a real data point on whether a document-wide default for `hide` or `mask` is worth adding. It is left for later.
