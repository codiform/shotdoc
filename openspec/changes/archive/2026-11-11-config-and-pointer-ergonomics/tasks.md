# Tasks

## 1. Unhover step

- [x] 1.1 Add `unhover` to the step type, the supported step list, and the parser: no value (a bare `- unhover:`) is accepted, any value is rejected naming the step number; verify unit tests for the bare form, a string value, a mapping value, and the supported-step list in the unsupported-step message
- [x] 1.2 Run `unhover` in the step runner by moving the pointer to the page's top-left corner, failing with the begin-with-a-goto message when no page is open; verify fixture tests on the rows page that a hovered row's delete control is visible after `hover` and gone after `unhover` in a captured image, that this holds when `unhover` starts a later block, and that `unhover` before any `goto` fails with that message
- [x] 1.3 Document `unhover` in the README steps table and the pointer section, including that it moves to the top-left corner and that `hover` on a neutral element is the workaround when the corner reacts; verify the README test still validates every example

## 2. Context-path goto

- [x] 2.1 Pull the `goto` URL resolution out of the step runner into a small function and change it to the context-path rule in the design (absolute URLs as written; otherwise the base treated as a directory plus the value without its leading `/`); verify unit tests for every scenario in the spec (`/`, `/login`, `login`, `./login`, a base with and without a trailing slash, a base with a path, an absolute URL, a query string such as `/?tab=2`), and that the existing tests that use `goto` still pass
- [x] 2.2 Prove it through the runner: the fixture server serves a page under a path, a document with that path in `baseUrl` and `goto: /` reaches it, and `goto: /other.html` stays under the path; verify with a fixture test that checks the page reached, and update any existing test or message that assumed `/` means the host root
- [x] 2.3 Document context paths in the README where base URLs and `goto` are described: `/` is the context root, not the host root, an absolute URL reaches anything else, and a trailing slash on `baseUrl` does not matter; verify the README test still validates every example

## 3. Configuration discovery and `--config`

- [x] 3.1 Add `findConfig(source, cwd, explicit)` implementing the order in the spec (explicit path, nearest `shotdoc.config.yaml` from the source file's directory upward, then the working directory's file) and change `loadConfig` to take the resolved path, resolve `outDir` against the file's directory and name the path in errors; update `build` and the existing tests that call `loadConfig`; verify unit tests for found above the source, nearest wins, explicit overrides discovery, a missing explicit file naming the path, fall back to the working directory, no file at all, a relative `outDir` landing beside the config, and the in-working-directory behavior unchanged
- [x] 3.2 Add `--config <path>` and `--config=<path>` to the CLI, before or after the source file, with the usage text updated and an error for a missing value or a repeated option; have `build` return the config path it used and have the CLI print `Using <relative path>` before the build summary only when that file is not in the working directory; verify CLI tests that run the real binary from a parent directory on a nested source with no flag and check that output lands beside the discovered config and the `Using` line appears, that a build in the working directory prints no `Using` line, that `--config` overrides a nearer file, that a missing file fails naming it, and that a missing value fails with usage
- [x] 3.3 Document discovery and `--config` in the README usage and configuration sections (the search order, that relative paths in the file resolve against the file's directory, and the `Using` line), and replace the example's rebuild instructions with the command from the project root; verify the README test still validates every example, and run the documented command by hand from the project root

## 4. Example and checks

- [x] 4.1 Re-read `examples/todomvc/input/todo-mvc.md` first, because it is being edited, then add the smallest `unhover` step where a click leaves the delete button showing (the screenshot after ticking a task) and change the first block's `goto: ./` to `goto: /`, with no new prose about shotdoc; verify the document validates against that example's config and `test/examples.test.ts` passes
- [x] 4.2 Rebuild the example from the project root with no flag against the live demo and look at every changed image, confirming the home page still loads from `goto: /`, the delete button no longer appears on the ticked row, and the other images still show their states; record what happened, and any gap, in a short note in the change directory
- [x] 4.3 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `openspec validate config-and-pointer-ergonomics --strict`; verify they all pass, and walk each added or changed scenario in the spec deltas to confirm it has a test or a recorded manual check, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving merges the deltas: `block-language` has two requirements replaced (YAML step lists, Goto step) and one added, and `doc-build` has one requirement replaced and one added (Configuration file selection).
- Update the status table in the note at the top of `openspec/changes/doxer-screenshot-docs-builder/proposal.md` if it is still there, and close GitHub issues #7 and #9 with the commit that lands them, and close #8 with a comment saying it was resolved by context paths instead of an empty `goto` and a warning.
- The README and example are not spec material; they ship with the code.
