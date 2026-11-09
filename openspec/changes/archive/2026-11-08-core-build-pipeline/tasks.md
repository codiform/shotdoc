# Tasks

## 1. Project setup

- [x] 1.1 Initialise a TypeScript ESM package at the repository root with a `shotdoc` bin entry, tsconfig, Vitest, and build, test, and lint scripts, plus a `.gitignore` for `node_modules/`, `dist/`, and `build/`; verify `npm run build` and `npm test` succeed and, since the project is not under version control, verify the ignore rules with `git check-ignore` in a scratch repository
- [x] 1.2 Add runtime dependencies (Playwright, markdown-it, yaml) and dev dependencies (Vitest, TypeScript, a PNG reader for tests), and install Chromium; verify a short script using the dependency launches headless Chromium, opens a page, and exits cleanly
- [x] 1.3 Add a test helper that serves `test/fixtures/` over local HTTP on a free port; verify a test fetches a fixture page through it and the server shuts down cleanly after the test

## 2. Errors and configuration

- [x] 2.1 Implement the build error type (file, block line, step number, target or URL, reason) and its message formatter; verify unit tests for messages with and without a step and target
- [x] 2.2 Implement `shotdoc.config.yaml` loading with defaults (1280x800, scale 2, output `build`), strict unknown-key rejection, and treating a missing file as empty; verify unit tests for defaults, overrides, an unknown key naming the key, and an absent file

## 3. Parsing and validation

- [x] 3.1 Implement block discovery: top-level `shotdoc` fences with their line ranges, non-shotdoc fences ignored, nested blocks rejected, and attribute handling (`js`, `state=`, `save=` reported as not supported yet, anything else unknown); verify unit tests for a recognised block, a `yaml` fence, a block inside a list item and a blockquote, a block after a list, each reserved attribute, and an unknown attribute, each message naming the attribute and line
- [x] 3.2 Implement YAML step-list validation and target parsing (CSS string, `role` and `name`, `text`, `label`); verify unit tests for malformed YAML, a non-list body, an item with two keys, an unsupported step name with its step number, each valid target form, and an invalid target mapping
- [x] 3.3 Implement step argument validation for `goto` (relative URL needs a base URL), `click`, `fill` (requires `value`), `wait` (one condition of visible, hidden, text, network idle, or milliseconds), and `screenshot` (required name of letters, digits, hyphens, and underscores, unique across the document, optional target, include, padding, alt); verify unit tests for every invalid case and for a duplicate name across two blocks
- [x] 3.4 Run validation across the whole document before launching a browser and report every problem found; verify a test where two different blocks are invalid reports both and a spy confirms no browser launch occurred

## 4. Session and step execution

- [x] 4.1 Implement the session: headless Chromium, a new context using configured viewport and scale with locale `en-US` and timezone `UTC`, a page opened at the first `goto`, and a clear "begin with a goto" failure for steps that need a page; verify fixture tests that read locale, timezone, and viewport size from the page and a test for the failure message
- [x] 4.2 Implement the step runner that wraps failures with the block line, step number, and target or URL, and implement `goto` with base-URL resolution and failure on an HTTP error status; verify fixture tests for a relative and an absolute URL, a 404 page failing with its URL and status, and a failing step preventing later steps from running
- [x] 4.3 Implement targets as locators with a rewritten message for several matches, and the `click` and `fill` steps; verify fixture tests for each target kind, a target matching two elements (message gives the count and target), and a missing element failing after the timeout and naming the target
- [x] 4.4 Implement the `wait` step conditions; verify a fixture that updates after a short delay: waiting for text succeeds, visible and hidden conditions succeed, network idle and a millisecond delay succeed, and a condition that never holds fails naming it
- [x] 4.5 Implement one continuous session per document with the first block starting clean; verify a test where block two clicks on the page block one opened, and a fixture using local storage showing a second build of the same document starts with no data from the first

## 5. Screenshot capture

- [x] 5.1 Implement the region math as pure functions (union of target and included elements, default padding 16, clamping to the page, rounding outward to whole CSS pixels); verify unit tests for padding, a corner element with padding 20, an element 82.39 CSS pixels wide, and multiple included regions
- [x] 5.2 Implement capture readiness (target and included elements visible and still across consecutive frames); verify fixture tests where an element slides into place and the image shows it in the final position, and where a target stays hidden and the step fails naming it
- [x] 5.3 Implement viewport screenshots and stable rendering (animations settled, caret hidden, configured scale); verify tests asserting a 2560x1600 image by default, dimensions following a configured viewport and scale, and no caret pixels for a focused field
- [x] 5.4 Implement element screenshots with padding, snapping, and `include`; verify fixture tests that image dimensions equal the whole-pixel region times scale on the fractional element, a corner element succeeds, a header plus its open menu are both in the image, and a missing included target fails naming it
- [x] 5.5 Implement viewport-first capture with scrolling into view and the full-page fallback for regions larger than the viewport; verify fixture tests for an element below the fold, a region that needs scrolling to fit, a page that blanks its content when the viewport is resized (image not blank, viewport size unchanged during capture), and an oversized region still producing an image

## 6. Emit and command line

- [x] 6.1 Implement building the output document by splicing line ranges (images in order, alt text or name, none for a block without screenshots, everything else byte-identical); verify unit tests including CRLF line endings, a block with two screenshots, a block with none, and an untouched non-shotdoc fence
- [x] 6.2 Implement output staging and naming (images staged then moved into place, built file at `<out>/<source name>`, images at `<out>/images/<name>/<screenshot>.png`, relative references, refusal when output equals the source, nothing written when a step fails); verify tests for the paths, repeat builds writing identical paths, failure leaving no built file and no new images, previous output intact after a failed rebuild, and the collision refusal
- [x] 6.3 Implement the `shotdoc build <file>` command with exit codes, readable error output, a missing-source message, and a missing-Chromium message that gives the install command; verify child-process tests for success, validation failure, step failure, a missing source file, and the missing-browser message
- [x] 6.4 Write the README (install and prerequisite, configuration keys, block syntax with examples, using `wait`, known limits); verify a test extracts every `shotdoc` example from the README and validates it without error

## 7. Integration

- [x] 7.1 Build an example document end to end against a local fixture site (multiple blocks, waits, an element screenshot, one with `include`) using the real command; verify the built Markdown and images match expectations, the unbuilt source renders as readable code blocks in a standard Markdown renderer, and the source file is byte-identical afterwards
- [x] 7.2 Optional live smoke: build the todomvc walkthrough against the live demo site, excluded from the default test run; verify it manually and record what happened in a note in the change directory
- [x] 7.3 Run the full test suite and `openspec validate core-build-pipeline --strict`; verify both pass and walk each spec scenario to confirm it has a test or a recorded manual check, listing any gap

## Workflow follow-up

- Archive the change after review requirements are satisfied.
- Next in the roadmap (see the note in `openspec/changes/doxer-screenshot-docs-builder/proposal.md`): `annotations-and-stability`. Update that note's status table when this change is archived.
