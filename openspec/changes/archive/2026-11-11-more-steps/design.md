# Design

## Context

See proposal.md for motivation. The steps are implemented in three places that each switch on the step kind: the `Step` type (`src/parse/types.ts`), `parseStep` (`src/parse/steps.ts`), and `exec` plus `stepTarget` (`src/run/steps.ts`). The first change's design said new steps would "register in one table", but the code uses `switch` statements, so each new step touches all four spots. For three small steps that is cheaper than a refactor, and the cost shows up as task detail, not new architecture.

Target strings are passed to Playwright's `page.locator()`, which already accepts Playwright's selector syntax. Probing the live TodoMVC demo confirmed that selectors like `.todo-list li:has-text("Take screenshots") >> role=checkbox` and `.todo-list li:nth-child(2) .toggle` each resolve to exactly one element through that path.

## Goals / Non-Goals

**Goals:**
- Three steps with the same error behavior as the existing ones: locatable failures name the step, target, and timeout.
- Validation of step arguments before any browser launches, as for existing steps.
- A correct statement of what selector strings accept, backed by tests, rather than an accident of the implementation.

**Non-Goals:**
- Restructuring the step plumbing into a registry. Revisit when `js` blocks arrive.
- Validating key names against Playwright's full key list in shotdoc.
- A first-class scoping syntax; see Decisions.

## Decisions

### `dblclick` is a separate step
It takes the same target forms as `click`. A modifier on `click` would force `click` to accept two shapes (a bare target, and a wrapper mapping with a `target` key), complicating the most common step for one use. If authors later need right-click, modifier keys, or a click position, an options form can be added to `click` additively, with `dblclick` kept as shorthand for a count of two.

*Alternative considered:* `click: {target, count: 2}`. Rejected for now for the grammar reason above.

### `press` takes a bare key or a mapping
- `press: Enter` is a string: the key goes to whatever has focus (`page.keyboard.press`). That is the natural form straight after a `fill`, which leaves focus on the field.
- `press: {key: Escape, target: ...}` is a mapping: the element is focused first (`locator.press`, which waits for it to be actionable).

A string can never be confused with a mapping, so no disambiguation rule is needed. A YAML number such as `press: 1` is rejected, with a message that says to quote it, because YAML would read `1` and `true` as non-text.

### Key names are checked for shape, not against a list
Validation checks only that the key is non-empty text of the form `Modifier+Modifier+Key` with no spaces. Whether a name such as `Entr` exists is left to Playwright at run time, where the failure is reported on the step and names the key.

*Alternative considered:* an allow-list of key names in shotdoc, so typos fail before the browser starts. Rejected: the list is long (function keys, numpad, punctuation codes) and would need to track Playwright, and a wrong list would reject valid keys. The cost of the choice is that a typo fails when the step runs, possibly after earlier blocks have already run.

### Hover leaves the pointer where it is
`hover` uses Playwright's pointer move, which stays put until another mouse action. The session is continuous across blocks, so a hover can carry into later blocks. This is wanted for the "hover, then screenshot" case, so no automatic reset is added. Authors who want the hover gone can hover or click somewhere neutral. The README says so.

*Alternative considered:* move the pointer to a corner before each screenshot. Rejected: it would break the main use of `hover`.

### Selector strings are documented as Playwright selector syntax
No code change is needed for the behavior. The spec, the README, and the parser's error message ("CSS selector string") are corrected to say selector string, and fixtures prove scoping works. A selector with a syntax error is caught by Playwright when the step runs, not at validation time.

*Alternative considered:* a first-class `within` form, such as `{role: checkbox, within: {text: Take screenshots}}`. It would read better and keep Playwright's syntax out of the language, but it needs design for what "within" scopes to (a text match is the label, not the row). Deferred until selector syntax proves insufficient.

### Tests use new fixture pages
- A page with several rows holding identically named checkboxes, for scoping.
- A page whose rows switch to an edit field on double-click, commit on Enter, and cancel on Escape.
- A page with a control visible only while its row is hovered, checked by capturing its image.
- A page that records key events with their modifiers, for `press`.

Existing tests that use `hover` as the "unsupported step" example change to `swipe`.

### The TodoMVC example extends what is already in `examples/todomvc/`
The directory already holds `shotdoc.config.yaml` (`baseUrl: https://demo.playwright.dev/todomvc/`, `outDir: output`, `deviceScaleFactor: 1`), `input/todo-mvc.md` with two blocks (the empty app, and a typed task), and a built `output/`. This change keeps the file names, the config, and the existing prose, and adds blocks that use the new steps. It is built from that directory, because configuration is read from the working directory, and it uses `goto: ./` because the base URL has a path.

Rebuilding replaces `output/todo-mvc.md` and `output/images/todo-mvc/`. The current `output/` is already behind the input (the built text differs from the input's prose), so it will be regenerated rather than merged. The superseded `test/live/todomvc.md` is removed.

A test parses every `examples/*/input/*.md` using that example's config, so the examples cannot drift out of validity. Building needs the live demo, so that stays a manual check excluded from the default test run.

## Risks / Trade-offs

- **Typos in key names fail late** → The failure names the step and key; an up-front list is a possible later addition.
- **Playwright's selector syntax is now part of the documented language** → It is stable and widely documented. The narrow exposure is acceptable, and a first-class scoping form can replace it later without breaking existing documents.
- **Hover state can leak across blocks** → Documented in the README.
- **The live example depends on a third-party demo** (the spike saw a demo page disappear) → The example is a manual check, not a gating test, and its input document is validated offline.
- **Unquoted selectors in YAML** → Selectors containing `:`, `>>`, or quotes need YAML quoting. The README examples show it.

## Open Questions

- Whether to check key names up front once real documents show how often typos happen.
- Whether `output/` of the example is committed. That is the repository owner's decision and does not affect the code.
