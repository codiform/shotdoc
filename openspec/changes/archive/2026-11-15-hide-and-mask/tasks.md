# Tasks

## 1. Syntax

- [x] 1.1 Add `hide`, `mask` (lists of targets) and `maskColor` (non-empty string) to the screenshot step type and `parseScreenshot`, naming each target as `hide[n]` or `mask[n]` in errors, and add them to the allowed-keys message; verify parser tests for each valid form (selector, role, text, label), a non-list value, a bad item naming its key and position, an empty or non-string colour, and that a screenshot with none of the keys parses as before

## 2. Capture

- [x] 2.1 Before capture, for each hide and mask target, wait for at least one match to be attached within the timeout and fail with the target and which option it came from if none does; keep these targets out of the "must match exactly one" message; verify fixture tests for several matches, no match (naming the target and "mask" or "hide"), and a late element
- [x] 2.2 Implement hide: set `visibility: hidden !important` on every match for the capture and restore each element's previous inline value and priority afterwards, including when the capture fails; verify fixture tests that the hidden area is background with the neighbouring element in place, that an element screenshot keeps its usual size, that a later screenshot without `hide` shows the element, and that hiding a full-width element at the top of the page (a fixture like the TodoMVC demo bar) leaves the rest of the page where it was
- [x] 2.3 Implement mask: pass the matched locators and colour (`#555555` default, `maskColor` override) to all three `page.screenshot` calls; verify fixture tests for solid colour over the element in a viewport screenshot, an element screenshot, and a region larger than the viewport with a mask below the first screen, the colour override, and a later screenshot without `mask`
- [x] 2.4 Check `maskColor` with `CSS.supports('color', value)` in the page and fail naming the colour if it is rejected; verify a fixture test for `not-a-colour` leaving no image
- [x] 2.5 Give the blank-image message a hint when the screenshot has a mask; verify a fixture test where an element is captured with padding 0 under a mask and the message mentions the mask, and that the message is unchanged without a mask

## 3. Docs and checks

- [x] 3.1 Document `hide`, `mask` and `maskColor` in the README: the steps table line, a short section with an example, the at-least-one-match rule, that the effect lasts for one screenshot, and a note that masking removes the content (so it does not suit a screenshot meant to show that data); verify the README test still validates every example
- [x] 3.2 Add `hide: [{text: This is just a demo}]` to each screenshot step in `examples/todomvc/input/todo-mvc.md` (nine), without changing the example's prose, and rebuild from the project root against the live demo; verify the demo bar is gone from every image (the yellow background, its bottom line and the link), the images keep their sizes, the area where the bar was shows the page background, and everything below that band is pixel-identical to the previous images
- [x] 3.3 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `openspec validate hide-and-mask --strict`; verify they all pass, and walk each scenario in the spec deltas to confirm it has a test, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving adds four requirements to `screenshot-capture` and replaces the `Screenshot step syntax` requirement in `block-language` (keeping its two existing scenarios).
- Close GitHub issue #2 with the commit that lands this.
- Consider filing an issue for freezing data by recording and replaying network responses, and one for script-driven motion (see the archived `capture-stability` change).
- Issue #16 (spike cleanup) stays blocked by #1 and #5.
