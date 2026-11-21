# Proposal

## Why

`hide` and `mask` apply to one screenshot, so a setting needed on every shot has to be repeated: the TodoMVC example repeats the same `hide` on all nine. Issue #18 is this change; the wider ideas it started from are split into #21, #22 and #23.

## What Changes

- A source document may begin with YAML front matter. Its `shotdoc.defaults` mapping holds `hide`, `mask` and `maskColor`, which apply to every screenshot in that document.
- Defaults add to a screenshot's own `hide` and `mask` lists (a union). A screenshot's own `maskColor` wins over the default.
- A screenshot can opt out with `defaults: false`.
- Default targets are lenient: one that matches nothing, or lies outside the captured region, is not an error and is not waited for. A screenshot's own targets keep today's strict rule.
- `annotate` is not accepted in defaults. Annotations stay per screenshot, because badge numbering and the exactly-one-match rule do not suit "every shot".
- Front matter is carried through to the built document unchanged.
- The TodoMVC example declares its demo-bar `hide` once.

Not in this change, and tracked as their own issues (#21 config defaults, #22 standing steps, #23 `annotate` defaults): defaults in `shotdoc.config.yaml` (project-wide), standing "from here on" steps with a clear step, and defaults for `annotate`. The design resolves a shot's effects from layers so those can be added as further layers without changing per-shot syntax.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `block-language`: front matter and `shotdoc.defaults` syntax, and a `defaults` key on `screenshot`.
- `screenshot-capture`: defaults are hidden and masked like a screenshot's own targets, are lenient when they match nothing, and the strict-match and blank-image-hint requirements are scoped accordingly.
- `doc-build`: front matter appears in the built document exactly as written.

## Impact

- `src/parse`: a front-matter reader; `parseDocument` and the screenshot parser gain the document's defaults.
- `src/run/capture.ts`: `applyEffects` unions defaults with the shot's own lists, without waiting for default targets.
- `README.md`, `examples/todomvc/`, tests and fixtures. No new dependency (the `yaml` package already parses step blocks).
- No change to existing documents: with no front matter, behaviour is as before.
