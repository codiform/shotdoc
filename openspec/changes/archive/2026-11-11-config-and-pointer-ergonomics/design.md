# Design

## Context

See proposal.md for motivation. Today `loadConfig(cwd)` in `src/config.ts` joins the working directory with `shotdoc.config.yaml`, resolves `outDir` against that directory, and reports errors against the file name. `build(sourcePath, cwd)` calls it, and `src/cli.ts` accepts exactly `build <file>` with no options. `goto` is parsed in `src/parse/steps.ts` (a non-empty string) and resolved in `src/run/steps.ts` with `new URL(url, base)`, so `/` goes to the host's root and an unslashed base path loses its last segment. The session keeps one page for the whole document, so the pointer position persists across blocks.

## Goals / Non-Goals

**Goals:**
- Building any example from the project root without changing directory and without naming its config.
- Default behavior (no option, config in the working directory) identical to today.
- One rule for `goto` paths that behaves the same whatever the base URL's trailing slash.

**Non-Goals:**
- A general warnings system, or warnings of any kind in this change.
- Overriding individual config keys from the command line.

## Decisions

### The config file is discovered from the source file upward, and `--config` overrides it
Order of choice: `--config <path>` if given; otherwise the first `shotdoc.config.yaml` found in the source file's directory, then each parent in turn up to the filesystem root; otherwise `<cwd>/shotdoc.config.yaml`, which stays optional. So `shotdoc build examples/todomvc/input/todo-mvc.md` finds `examples/todomvc/shotdoc.config.yaml` from the project root without naming it, and the example's path is not written twice.

Why search from the source file and not from the working directory: the case that motivated this runs from the project root, where a search from the working directory would never reach the example's config. Why keep the working-directory fallback: it keeps every invocation that works today working, including a source outside the current tree.

`loadConfig` takes the resolved config path (or `undefined` for none) and resolves `outDir` against the file's directory. A small `findConfig(source, cwd, explicit)` does the choosing and is the only place that knows the order. The `--config` path comes from the command line, so a missing file is an error that names it; discovered files exist by construction. Config error messages name the path in the way the user would recognize it (as given for `--config`, and relative to the working directory when discovered).

`src/cli.ts` parses its arguments by hand. It gains `--config <path>` and `--config=<path>`, accepted before or after the source file, with the usage text and an error when the value is missing or the option is repeated. The source path is still resolved against the working directory.

For visibility, the build result carries the path of the config file it used, and the CLI prints `Using <relative path>` before the build summary only when that file is not in the working directory. Someone whose build picks up a stray `shotdoc.config.yaml` from a parent directory sees which one, and the common case stays quiet.

With the default location the old and new readings of relative paths give the same answer, so nothing changes for existing use. For a discovered or named file, resolving `outDir` against the config's directory means the same file writes to the same place wherever the command is run, which is the surprise this change exists to remove. `baseUrl` is a URL and is not affected.

*Alternatives considered:* `--config` alone (rejected: it repeats the example's path and makes the author know where the file is); searching from the working directory (rejected: it misses the motivating case); stopping the search at a repository root (rejected for now: it needs a notion of repository and the printed path covers the surprise); merging several config files (rejected: one file is easier to reason about); `--out-dir` and other overrides (rejected as out of scope, and they would multiply the places a setting can come from).

### `goto` paths are context paths, resolved against the base URL as a directory
Today `goto` uses `new URL(url, base)`, so `/` means the host's root, `./` means the base's directory, and a base without a trailing slash loses its last segment. People think of the configured base URL as the application, and of `/` as its root. Resolution becomes:

1. If the value has a scheme (the existing `isAbsolute` test), use it as written.
2. Otherwise take the base URL with a trailing `/` ensured on its path, strip one leading `/` from the value, and resolve with `new URL(rest, base)`.

So `/` gives the base itself, `/login` and `login` and `./login` all give the base's path plus `login`, and `https://host/app` behaves the same as `https://host/app/`. Query strings and fragments in the value come through as written (`/?tab=2`), and `..` segments still normalize in the usual way; going above the base is the author's choice. Values starting with `//` (protocol-relative) are not special-cased; they are not meaningful for a documentation tool, and the leading `/` rule applies to them.

This deliberately differs from standard URL resolution and from Playwright's own `baseURL` option, in return for a rule that works the same whether or not the base URL ends in `/`. The README states it near the top of the base URL text: `/` is the context root, not the host root. It also makes the earlier idea of a warning for an unslashed base URL unnecessary, so that is dropped. To reach the host root, write an absolute URL.

This is a visible change in one case: a base URL with a path, plus a `goto` starting with `/`. It is stated in the proposal's compatibility note and in a scenario.

*Alternatives considered:* an empty `goto` meaning the base URL (rejected: indistinguishable from a forgotten value); `goto: .` as the documented idiom (rejected: still cryptic, and it keeps the trailing-slash trap); starting at the base URL automatically when a document begins without `goto` (rejected: implicit, and it changes the rule that a document begins with `goto`); a `base` keyword (rejected: ambiguous with a path named `base`).

### `unhover` is a step with no argument that moves the pointer to the corner
The step takes no value (`- unhover:`) and anything else fails validation, naming the step. It runs `page.mouse.move(0, 0)`, which delivers pointer-leave events to whatever was hovered. It does not wait for or target an element, so it needs no timeout handling, and it fails with the usual "begin with a goto" message when no page is open.

The corner is a fixed choice: the rule is simple to document and to test, and it is almost always empty. If a page has something that reacts to the corner, the author can `hover` on a neutral element instead, which the README says.

*Alternatives considered:*
- `hover` with no target. Rejected: `hover` takes the same target forms as `click`, and a missing value there should stay an error rather than do something different.
- `hover: none` or a keyword target. Rejected: a string is read as a selector, so `none` would mean an element named `none`.
- A `pointer: away` style step with options. Rejected: more grammar than one pointer position needs.

### Where the new behavior is tested
- `findConfig` and `loadConfig`: each scenario in the spec (found above the source, nearest wins, named file overrides, missing named file, falls back to the working directory, no file at all), relative `outDir` resolution against the config's directory, and the default behavior unchanged.
- CLI: building from the project root with no flag finds the config above the source, writes beside it and prints `Using ...`; `--config` before and after the source; a missing value; a missing file; and a build in the working directory prints no `Using` line (the existing CLI test harness already runs the real binary in a temporary directory).
- Parser: `unhover` with and without a value.
- Resolution: the `goto` scenarios in the spec (`/`, `/login`, `login`, `./login`, with and without a trailing slash on a base URL that has a path, and an absolute URL), as unit tests of the resolver. One runner test confirms the browser lands on a page under a base path served by the fixture server.
- Runner: `unhover` ends the hover state on the existing rows fixture, checked by capturing an image of the delete control, including across blocks.

### Example
The TodoMVC example gets an `unhover` where a click leaves the delete button showing on a row, its first block's `goto: ./` becomes `goto: /`, and it is rebuilt from the project root with `--config`. The example's prose stays about TodoMVC (the repository's context says so); the explanation of `unhover` goes in the README. The example's rebuild instructions in the README gain the `--config` form.

## Risks / Trade-offs

- **The corner can be hoverable** → Documented; `hover` on a neutral element is the workaround.
- **A stray config in a parent directory is picked up** → The build prints which file it used whenever it is not in the working directory, and `--config` overrides. The search is not stopped at a repository boundary.
- **A source outside the working directory's tree now uses the config above it** → The working-directory fallback covers sources with none above them; the compatibility note in the proposal states the change.
- **Config path semantics could surprise someone who expects working-directory paths** → The scenarios and README state it, and it matches the default behavior.
- **Existing documents that use `/path` with a base URL that has a path change meaning** → Stated in the proposal and the README; the project is new and the common base URL has no path.
- **Departing from standard URL resolution may surprise people who know it** → The README states the context-path rule where base URLs are introduced.
- **`loadConfig`'s signature changes** → It is internal; its tests and `src/build.ts` are the only callers.

## Open Questions

None.
