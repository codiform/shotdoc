# Proposal

## Why

Three rough edges came up while building the TodoMVC example:

- **Building from outside the example's folder is not possible.** Settings are read only from `shotdoc.config.yaml` in the working directory, so rebuilding `examples/todomvc` means changing into it first, and naming the config by hand would repeat the example's path twice (GitHub issue #7).
- **`goto` and the base URL are awkward.** Going to the app's home page takes `goto: ./`, because `goto: /` means the host's root and drops any path in the base URL. A base URL with a path but no trailing slash (`https://host/app`) also loses its last segment when a relative URL is resolved against it (issue #8).
- **Hover state leaks.** `hover`, `click` and `dblclick` leave the pointer where it was, so a hover effect appears in later screenshots. In the TodoMVC example, the delete button stays showing on the row that was just ticked, and there is no way to clear it (issue #9).

## What Changes

- Find the configuration file the way git and tsconfig do: from the source file's directory upward, the nearest `shotdoc.config.yaml` wins, so `shotdoc build examples/todomvc/input/todo-mvc.md` works from the project root with no option. If none is found, fall back to the working directory's file as today.
- Add a `--config <path>` option to `shotdoc build` that overrides discovery. A file named this way that does not exist is an error.
- Resolve relative paths inside a config file (`outDir`) against that file's directory, which is the same as today when the file is in the working directory.
- When the configuration file used is not in the working directory, name it in the build output, so a config picked up from a parent directory is never a surprise.
- Make a `goto` path that is not an absolute URL a *context path*: it is resolved against the base URL treated as a directory, so `goto: /` is the base URL itself (the application's context root) and `goto: /login` is the base URL's path followed by `login`, whether or not the configured base URL ends in `/`. This differs from standard URL resolution, where `/` means the host's root; the README says so. Absolute URLs are used as written, and `goto: ./` keeps working.
- Add an `unhover` step that moves the pointer to the top-left corner of the page, ending any hover. It takes no value.
- Use `unhover` in the TodoMVC example where a click leaves the delete button showing, write its first block's `goto` as `/`, and rebuild the example's output.

## Out of scope

- The script that rebuilds every example (issue #15). With discovery it becomes a loop over the source files.
- A `--outDir` flag, or other options that override configuration keys.
- Merging several config files, and stopping the upward search at a repository boundary.
- Options on `click`, other new steps, key-name validation and `imagesDir` (issues #10 to #14).
- Choosing where `unhover` moves the pointer; it is always the top-left corner.
- A warning for the unslashed base URL, an empty `goto`, and treating `//host/path` specially; context paths make the first two unnecessary.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `doc-build`: the configuration file is found by searching upward from the source file, can be named with `--config`, is reported when it is not in the working directory, and relative paths in it resolve against that file's directory.
- `block-language`: `goto` paths are context paths relative to the base URL's path, and `unhover` joins the supported steps.

## Impact

- **Code:** the CLI argument handling in `src/cli.ts`, `loadConfig` in `src/config.ts` (and its one caller in `src/build.ts`), `goto` resolution in `src/run/steps.ts`, and a new step in the step type, parser and runner.
- **Tests:** config tests for discovery, the named file and path resolution, CLI tests for the option, parser and runner tests for context-path `goto` and `unhover` (using the existing hover fixture).
- **Docs and examples:** the README (usage, configuration, the context-path rule for `goto`, steps table, pointer behavior, and the example's rebuild instructions) and the TodoMVC example, whose prose stays about TodoMVC; shotdoc features are explained in the README.
- **Dependencies:** none.
- **Compatibility:** with the source in or below the working directory and the config in the working directory, behavior is the same as before. Two things differ: a `shotdoc.config.yaml` closer to the source file than the working directory is now used, and a source file outside the working directory's tree uses the nearest config above it, falling back to the working directory's file only when none is found. A step named `unhover` is no longer rejected. One more behavior changes: with a base URL that has a path, a `goto` starting with `/` used to go to the host's root and now goes under the base path (`https://host/app/` plus `/login` was `https://host/login` and is now `https://host/app/login`). Base URLs without a path, which is the common case, are unaffected. Documents that relied on the old meaning must write an absolute URL.
