# Tasks

## 1. Project setup

- [ ] 1.1 Initialise a Node/TypeScript package with a test runner, lint, and build scripts; verify `npm test` runs (with no tests yet) and `npm run build` succeeds
- [ ] 1.2 Add dependencies (Playwright, a CommonMark Markdown parser, a YAML parser, an image-diff library for determinism checks) and install Chromium; verify a trivial script can launch headless Chromium and exit cleanly
- [ ] 1.3 Add a `.gitignore` covering `node_modules/`, the build output directory, and `.doxer/states/`; verify `git check-ignore` reports each path as ignored

## 2. Spike: screenshot quality and determinism

Spike code may be rough, but its findings are recorded and fed back into the design.

- [ ] 2.1 Spike saucedemo.com: log in manually-or-scripted once, save state, then headlessly load it and capture an element crop with padding of a post-login screen; verify the crop needs no manual editing and a run with the state deleted fails clearly
- [ ] 2.2 Spike play.grafana.org: capture a dashboard panel with timestamps and live data masked or frozen; verify two consecutive runs produce visually identical images using the image-diff library, recording the difference threshold needed
- [ ] 2.3 Spike demo.playwright.dev/todomvc: run a multi-step walkthrough (add items, complete one, filter) with a locator-positioned highlight at each step; verify continue-versus-fresh behaviour by running a later step from a fresh context
- [ ] 2.4 Spike annotations: implement highlight, arrow, and numbered badge as an injected overlay and verify the arrow is not cropped away when an element capture is requested (clip is the union of element and annotation bounds)
- [ ] 2.5 Optional: reproduce the annotated Datasette menu screenshot from shot-scraper's announcement using the helpers instead of raw JS; verify the result is comparable to the original
- [ ] 2.6 Write up spike findings (what worked, determinism threshold, font/OS caveats, chosen default viewport and scale, annotation option names) and update design.md accordingly; verify each spec scenario under screenshot-capture is either confirmed feasible or has a recorded change to the spec

## 3. Document parsing and build output (doc-build, block-language)

- [ ] 3.1 Implement Markdown parsing that locates doxer blocks (info string, attributes, body, source line) and leaves other content byte-for-byte; verify unit tests cover recognised blocks, non-doxer fenced blocks, unknown attributes, and line numbers
- [ ] 3.2 Implement YAML step parsing and validation for goto, click, fill, wait, screenshot, highlight, arrow, hide, and mask; verify unit tests cover valid steps and invalid steps reported with file and line before any browser launches
- [ ] 3.3 Implement the built-document emitter: replace each executed block with image references and write images to deterministic paths under a separate output directory; verify tests that the source file is byte-identical after a build, a colliding output path is refused, and duplicate screenshot names are rejected
- [ ] 3.4 Implement `doxer.config.yaml` loading (base URL, viewport, scale, output directory, state declarations) with defaults, and relative `goto` resolution; verify tests for relative and absolute URLs and for the missing-base-URL error
- [ ] 3.5 Implement build error reporting (file, line, step, selector, reason) and non-zero exit; verify a test where a selector never appears produces that message and no success status
- [ ] 3.6 Document the block syntax and config in a README section and verify every example in it is parsed successfully by a test that extracts the README's doxer blocks

## 4. Session state (session-state)

- [ ] 4.1 Implement the session manager: one browser per build, continue by default, `state=fresh`, `state=<name>`, and `save=<name>` (written only after a block succeeds); verify tests against a local test page for continue, fresh isolation, save and reload, and no save on failure
- [ ] 4.2 Implement missing-state detection with a message naming the state and how to create it; verify a test referencing a never-saved name fails before running the block
- [ ] 4.3 Implement the interactive `doxer login <name>` command (headed browser, user logs in, state saved on completion); verify manually against saucedemo.com and that a following headless build uses the saved state
- [ ] 4.4 Implement author-supplied validity checks for named states and fail with a refresh instruction when a check fails; verify a test with a state whose check fails writes no screenshot
- [ ] 4.5 Implement first-save protection for state files (ignore guidance or warning) and ensure state contents never appear in output; verify with a test that built output contains no cookie values
- [ ] 4.6 Document login, named states, and validity checks in the README and verify the documented commands run as written

## 5. Screenshot capture (screenshot-capture)

- [ ] 5.1 Implement viewport, full-page, and element screenshots with padding and bounds clamping; verify tests assert image dimensions for each mode and failure when a locator matches nothing
- [ ] 5.2 Implement the annotation overlay (highlight, arrow, numbered badge) positioned from rendered bounds at capture time, with clearing; verify tests check overlay presence in pixels, that layout of the page is unchanged by annotations, and that a changed viewport moves the annotation
- [ ] 5.3 Implement hide and mask steps; verify a test that a masked region is a solid fill and a hidden element's layout space remains
- [ ] 5.4 Implement stable rendering (fixed viewport and scale, disabled animations, hidden caret, fixed locale and timezone); verify the viewport/scale dimension scenario and an animated test page captured in its final state
- [ ] 5.5 Add a determinism test building a fixture document twice and diffing corresponding images within the threshold recorded in the spike; verify it passes locally
- [ ] 5.6 Implement the `js` block runtime exposing `page` and the shared capture and annotation helpers; verify tests that a js block can perform a custom interaction, capture a screenshot, and that a thrown error fails the build with the block's file and line

## 6. Integration

- [ ] 6.1 Author an end-to-end example document that walks through todomvc using YAML and `js` blocks with highlights; verify building it produces the expected built Markdown and images, and that the unbuilt source renders as readable code blocks in a standard Markdown renderer
- [ ] 6.2 Run the full test suite and the example build twice from a clean checkout; verify all tests pass and the two example builds are visually identical
- [ ] 6.3 Run `openspec validate doxer-screenshot-docs-builder --strict`; verify it reports the change valid and walk each spec scenario to confirm it is covered by a test or a recorded manual check

## Workflow follow-up

- Archive the change after review requirements are satisfied.
- Follow-on changes already identified: HTML rendering from an externalised template (Pandoc candidate), programmatic login for CI, and rebuild caching.
