# Proposal

## Why

The first working version of shotdoc can drive a page with `goto`, `click`, `fill`, and `wait`, but a realistic walkthrough needs more. Probing the live TodoMVC demo, the app we want as the example, showed what is missing:

- **No way to press a key.** TodoMVC adds an item only when Enter is pressed, and commits an edit with Enter. `fill` types the text, but nothing can submit it.
- **No double-click.** TodoMVC's edit mode appears only on a double-click, which `click` cannot do.
- **No hover.** The Delete button is not in the page until the row is hovered, so a screenshot of that state is impossible.
- **Identical elements cannot be told apart.** There are three checkboxes all named "Toggle Todo", and the `listitem` role matches six elements (three todos plus three filter links). The "exactly one match" rule makes both unusable as written. Playwright's selector syntax already solves this (for example `li:has-text("Take screenshots") >> role=checkbox`) and shotdoc's selector strings already pass it through, but the spec calls these strings "CSS selectors", which they are not entirely.

Without these, the example can only show an empty page and typed text. Doing this now also lets the example drive the next design question (annotations) with real material.

## What Changes

- Add a `press` step. A bare key (`press: Enter`) presses it on whatever has focus, which is right after a `fill`. A mapping (`press: {key: Enter, target: ...}`) focuses an element first. Keys use Playwright's names and may be combined with modifiers (`Control+A`).
- Add a `dblclick` step. It takes the same targets as `click`.
- Add a `hover` step. It takes the same targets as `click`. The pointer stays where it was left until a later step moves it, so the hover state remains visible in later screenshots.
- State in the spec that selector strings use Playwright's selector syntax (CSS plus extensions such as `:has-text()`, `:nth-child()`, `>>` chaining and `role=`), and give a scoping scenario. No new code is needed for this, only a correct spec and README text.
- Because `hover` becomes a supported step, the spec's "unsupported step" scenario and the tests that use `hover` as the unsupported example move to a different name.
- Extend the existing `examples/todomvc/` walkthrough, which currently has two screenshots (the empty app and typed text), to use the new steps. Replace the superseded smoke document `test/live/todomvc.md`, and keep every example document valid with a test.

## Out of scope

- Annotations, hide and mask, freezing, and the blank-capture guard (the `annotations-and-stability` change).
- A first-class scoping form such as `{role: checkbox, within: ...}`. Selector syntax covers the need for now; revisit if authors keep reaching for it.
- Options on `click` (right-click, modifiers, click position, triple-click). `dblclick` stays a separate step; an options form can be added later without breaking it.
- Other steps: `check`, selecting from a dropdown, scrolling, dragging, file upload, key-by-key typing.
- Conveniences around `goto` and configuration: an empty `goto` meaning the base URL, a warning when `baseUrl` has a path but no trailing slash, and a `--config` flag.
- `js` blocks, named states, login, HTML output, caching.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `block-language`: the supported step list gains `press`, `dblclick`, and `hover`, each with its own requirement. The targets requirement now says selector strings use Playwright's selector syntax. The unsupported-step scenario uses a different example step.

## Impact

- **Code:** the step type, the step parser (including key validation), and the step runner in `src/parse` and `src/run`. The parser and runner use `switch` statements per step, not a registration table, so each new step touches four places.
- **Tests:** new fixture pages for editing, hover, keys, and repeated elements; existing tests that use `hover` as an unsupported step change.
- **Docs and examples:** the README steps table and targets section, and the existing `examples/todomvc/` (config, `input/todo-mvc.md`, built `output/`), which this change extends and rebuilds. Its file names and config stay as they are.
- **Dependencies:** none.
- **Compatibility:** documents written for the first version keep working. The only observable change is that a step named `hover` is no longer rejected.
