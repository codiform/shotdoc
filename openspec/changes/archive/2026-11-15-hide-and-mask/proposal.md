# Proposal

## Why

Some content should not appear in documentation screenshots: account names, avatars, dates, counters (GitHub issue #2). Some of it also changes between builds, which makes the images differ for no reason. Today the author has no way to leave an element out of an image short of changing the page.

The spike (archived `spike-screenshot-quality`) showed that painting a solid block over the volatile region of a live Grafana panel made two runs pixel-identical (0 differing pixels, against about 190,000 unmasked), and that a neutral mid-grey worked as the colour. The earlier design for this was two steps, `hide` and `mask`, that stayed in effect until cleared. This change makes them options on a single screenshot instead, so nothing carries over into later screenshots in the one-session document.

## What Changes

- The `screenshot` step gains two lists of targets:
  - `hide`: the elements are invisible in the image and keep their space, so nothing around them moves.
  - `mask`: the elements are covered by a solid block, in a default neutral grey.
- A third key, `maskColor`, overrides the block's colour for that screenshot.
- Targets use the existing forms (selector string, `role`, `text`, `label`). Unlike other targets, a `hide` or `mask` target may match one or many elements. It must match at least one: shotdoc waits for one to appear and fails, naming the target, if none does within the timeout. A selector that quietly stopped matching would otherwise leave the data in the image.
- Both apply to the one screenshot and the page is put back afterwards. They work for viewport and element screenshots.
- A screenshot that has a `mask` and still fails the blank-image check gets a hint that the mask may cover everything captured.
- The README documents the options.
- The TodoMVC example hides the demo bar ("This is just a demo...") in its screenshots, as a real use of `hide`. Its prose is unchanged.

## Out of scope

- Freezing data by recording and replaying network responses (the spike's "freeze"). It keeps the real content visible, where masking removes it, so it solves a different problem. No issue covers it yet.
- Hiding or masking for every screenshot in a document or in the config. Each screenshot lists its own.
- Annotations (#1), which will need similar page changes at capture time but are a separate change.
- Blur, pixelation, or anything other than a solid block.
- Masking inside iframes beyond what Playwright does by default, and masking shadow-DOM content by anything other than the existing target forms.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `block-language`: the screenshot step accepts `hide`, `mask` and `maskColor`, and rejects malformed values before launching a browser.
- `screenshot-capture`: requirements are added for hidden elements, masked elements, the at-least-one-match rule, and the blank-image hint when a mask is present.

## Impact

- **Code:** screenshot parsing in `src/parse/steps.ts` and the step type in `src/parse/types.ts`; capture in `src/run/capture.ts` (apply hide and mask around the capture, restore afterwards).
- **Tests:** parser tests for the new keys; fixture tests through the runner for hide, mask, several matches, no match, the colour override, the viewport and element paths, and a region larger than the viewport; a test that the page is restored and a later screenshot is unaffected.
- **Docs:** the README screenshots section and the screenshot line in the steps table.
- **Example:** `examples/todomvc/input/todo-mvc.md` (a `hide` key on each of nine screenshot steps) and its nine built images.
- **Dependencies:** none.
- **Compatibility:** purely additive. Documents that do not use the new keys behave as before. The unknown-key message for `screenshot` lists the new keys as allowed. The TodoMVC example's nine images change: an empty band of page background replaces the demo bar.
