# Tasks

## 1. Fixtures and the unsupported-step example

- [x] 1.1 Add fixture pages under `test/fixtures/` for the new behavior: a list whose rows hold identically named checkboxes, rows that switch to an edit field on double-click (commit on Enter, cancel on Escape), a row whose delete control is visible only while the row is hovered, and a page that records key events with their modifiers; verify a test loads each page through the fixture server and finds its main element
- [x] 1.2 Change the existing tests and the unit-test examples that use `hover` as an unsupported step (`test/parse/steps.test.ts`, `test/parse/document.test.ts`, `test/cli.test.ts`, `test/build.test.ts`) to use `swipe`, ahead of `hover` becoming supported; verify the whole suite still passes

## 2. Press step

- [x] 2.1 Add the `press` step to the step type and parser: a bare key string, or a mapping with `key` and optional `target`; key shape checked as modifiers joined by `+` and a final key, with no spaces; numbers and other non-text rejected with a hint to quote; unknown mapping keys rejected; verify unit tests for `Enter`, `Control+A`, `Shift+Tab`, a bare `+`, a mapping with and without a target, a missing key, `press: 1` (message mentions quoting), an empty string, and an unknown mapping key, each naming the step number
- [x] 2.2 Run `press` in the step runner: without a target on the focused element, with a target after focusing it; an unknown key name fails the step and the message names the key; verify fixture tests for Enter after a `fill` reaching the page, Escape with a target, `Control+A` seen with its modifier, a typo such as `Entr` naming the key, and `press` before any `goto` failing with the begin-with-a-goto message
- [x] 2.3 Document `press` in the README (both forms, key names, modifiers, the `fill` then `press: Enter` pattern) and verify the README test still validates every example

## 3. Double-click and hover steps

- [x] 3.1 Add `dblclick` and `hover` to the step type and parser, accepting every target form `click` accepts; verify unit tests for each target form on both steps, and for an invalid target naming the step
- [x] 3.2 Run `dblclick` and `hover` in the step runner; verify fixture tests for a double-click opening edit mode, a missing target failing after the timeout and naming it, a target matching two elements giving the count, a hover making the delete control appear in a captured image, and the hover still in effect for a screenshot in a later block
- [x] 3.3 Document `dblclick` and `hover` in the README, including that the pointer stays where it was left until another step moves it, and verify the README test still validates every example

## 4. Selector syntax

- [x] 4.1 Change the parser's target error message from "CSS selector string" to "selector string"; verify the unit tests that check target errors match the new text
- [x] 4.2 Prove scoping through the real runner and check error readability; verify fixture tests where a selector using `:has-text()` plus `>> role=checkbox` clicks only the checkbox in the row with a given text, `:nth-child()` picks one row, a target matching all three checkboxes still fails with a count of 3, and a selector with a syntax error fails the step with a one-line message that names the target
- [x] 4.3 Document selector syntax in the README targets section with YAML quoting examples (a selector containing a colon, quotes, or `>>`) and verify the README test validates them

## 5. Example and integration

- [x] 5.1 Extend `examples/todomvc/input/todo-mvc.md`, keeping its file name, its prose, and `examples/todomvc/shotdoc.config.yaml` as they are, with blocks that add items with `fill` and `press`, toggle one through a scoped selector, hover a row, edit one with `dblclick`, `fill`, and `press`, filter with a link and wait on the result, and clear completed; remove the superseded `test/live/todomvc.md`; verify the document passes validation with that config's base URL
- [x] 5.2 Add a test that parses every `examples/*/input/*.md` using the config next to it and verify it passes, and that it fails when a step is broken (checked once by hand)
- [x] 5.3 Build the example by hand against the live demo (`cd examples/todomvc && node ../../dist/cli.js build input/todo-mvc.md`), which replaces the existing `output/todo-mvc.md` and `output/images/todo-mvc/`; verify the images show each state (empty, three items, one completed, the delete control on hover, edit mode, filtered list) and that the built Markdown matches the input's prose, and record what happened and any gaps in a note in the change directory
- [x] 5.4 Run the full test suite and `openspec validate more-steps --strict`; verify both pass, and walk each added or changed scenario in the spec delta to confirm it has a test or a recorded manual check, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving merges the delta into `openspec/specs/block-language`: two requirements are replaced and two are added.
- Update the status table in the note at the top of `openspec/changes/doxer-screenshot-docs-builder/proposal.md` to record this change, and keep `annotations-and-stability` as the next planned change.
- The README and example are not spec material; they ship with the code.
