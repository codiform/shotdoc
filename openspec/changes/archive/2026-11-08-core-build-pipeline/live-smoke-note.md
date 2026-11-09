# Live smoke note (task 7.2)

Document: `test/live/todomvc.md`, built by hand with `cd test/live && node ../../dist/cli.js build todomvc.md` against https://demo.playwright.dev/todomvc/ on 2026-11-08. Excluded from the default test run.

## Result

The build succeeded: exit 0, two images, built Markdown as expected.

- `empty.png` is 2560x1600 (viewport at scale 2).
- `input.png` is the `.todoapp` element with 12px padding, 1148x182 px, showing the typed text and no caret.

## What it showed

- A first attempt failed as designed: it clicked the "Active" link, which TodoMVC only renders once an item exists. The error named the file, block line 11, step 2, the target `role=link name="Active"`, and the 10s timeout.
- **Gap:** the step set has no way to press a key such as Enter, so the walkthrough could not add a todo item (the spike's walkthrough did `fill` then `press Enter`). A realistic todo-list walkthrough therefore cannot be written with the steps in this change. Candidates for a later change: a `press` step (`- press: {target: ..., key: Enter}`), or `fill` with a submit option. This was not added here because it is outside the specs of this change.

# Scenario coverage walk (task 7.3)

Every scenario in the four specs was matched to an automated test, except these, which rest on a structural or manual check:

- **session-state / Unattended build** (no window, no prompt): Chromium is launched `headless: true`, nothing in the code reads stdin, and the CLI tests run with stdin closed. No test asserts the absence of a window directly.
- **session-state / Repeat builds are independent**: tested at the `Session` level (two sessions, second reads empty local storage), not by running `build` twice on a document that writes storage.
- **doc-build / Unknown configuration key** ("before executing any block"): `loadConfig` runs before parsing and is unit-tested, but no CLI-level test checks that no block ran.
- **screenshot-capture / Locale and timezone** and **Caret**: covered, but the caret test compares against a capture with the caret made transparent rather than looking for caret pixels.
