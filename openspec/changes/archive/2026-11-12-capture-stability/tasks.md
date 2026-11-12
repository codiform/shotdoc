# Tasks

## 1. Blank-capture guard

- [x] 1.1 Add a module that reports whether a PNG buffer is a single colour (every pixel equal on red, green, blue and alpha, and which colour), and move `pngjs` from development to runtime dependencies; verify unit tests with images built in the test for all white, solid red, a single different pixel in a large image (not blank), a two-colour image, and a one-pixel image
- [x] 1.2 Update the existing capture tests and fixtures that deliberately capture a solid colour (`test/run/capture.test.ts` lines using `everyPixelIs`, and `corner.html`, `fractional.html`, `huge.html`, and the others they use) so each fixture also contains a second colour outside the element, and each test still proves what it proved before (crop size and coverage); verify the whole suite passes before the guard is wired in
- [x] 1.3 Take the image into memory in `takeScreenshot`, run the check, and write the file only if it passes, failing with the message in the design (screenshot name, colour, suggestion to wait); verify fixture tests for a blank page with no target, a solid element with padding 0 failing, the same element with the default padding passing, a normal page passing, the message naming the screenshot and the target through the runner, and that no image file is left in the stage directory after a failure
- [x] 1.4 Document the guard in the README screenshots section and its limits in Known limits (only a completely single-colour image is caught, so a solid element with padding 0 needs padding; a partly blank page is not detected); verify the README test still validates every example

## 2. Repeatable output

- [x] 2.1 Add a fixture page with an endless CSS animation and a CSS transition, and a test that builds a small document twice through `build()` (a viewport screenshot and element screenshots of this page and of existing fixture pages) and compares every image byte for byte; verify it passes, and check once by hand that it fails when a script-driven animation is introduced into the document, then remove that experiment
- [x] 2.2 State in the README Known limits that script-driven animation is not frozen and that identical output across machines is not guaranteed; verify the README test still validates every example

## 3. Checks

- [x] 3.1 Rebuild `examples/todomvc` against the live demo from the project root and confirm no screenshot is rejected and no image changes (`git status` shows no change under `examples/todomvc/output`); record the result in a short note in the change directory
- [x] 3.2 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `openspec validate capture-stability --strict`; verify they all pass, and walk each scenario in the spec delta to confirm it has a test or a recorded manual check, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving adds two requirements to `screenshot-capture`.
- Close GitHub issue #3 with the commit that lands this, noting that animation and caret freezing already existed in the core pipeline.
- Consider filing issues for the two things left out: freezing script-driven motion (the paused-clock probe is described in the design) and freezing data by recording and replaying network responses.
- The README is not spec material; it ships with the code.
