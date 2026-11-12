# shotdoc

Write documentation in Markdown, drive a real browser from fenced `shotdoc` blocks, and build the result: each block is replaced by the screenshots it took.

The source file stays valid Markdown. Without building, a `shotdoc` block just renders as a code block, so the source is still readable.

## Example

[`examples/todomvc/`](examples/todomvc/) documents the Playwright TodoMVC demo app:

- [`input/todo-mvc.md`](examples/todomvc/input/todo-mvc.md) is the source you write.
- [`output/todo-mvc.md`](examples/todomvc/output/todo-mvc.md) is what `shotdoc build` produces, with its screenshots in [`output/images/`](examples/todomvc/output/images/todo-mvc/).
- [`shotdoc.config.yaml`](examples/todomvc/shotdoc.config.yaml) sets the base URL and output directory.

To rebuild it, run this from the project root. The build finds the example's config file above the source and writes the output beside it:

```sh
shotdoc build examples/todomvc/input/todo-mvc.md
```

## Prerequisites

- Node.js 20 or later
- The Chromium browser used by Playwright:

  ```sh
  npx playwright install chromium
  ```

## Usage

```sh
shotdoc build guide.md
```

This runs every `shotdoc` block in `guide.md`, in order, in one browser session, then writes:

- `build/guide.md` — the document with each block replaced by image references
- `build/images/guide/<name>.png` — one image per `screenshot` step

The source file is never modified. If any step fails, nothing is written and the exit status is non-zero. The error names the file, the block's line, the step number, and the target or URL.

All blocks are checked before a browser is launched, and every problem found is reported.

## Configuration

Settings come from an optional `shotdoc.config.yaml`. Unknown keys are an error. The file is chosen in this order:

1. The file named with `--config <file>`, if you give one: `shotdoc build --config shared/shotdoc.config.yaml guide.md`. It is an error if it does not exist.
2. Otherwise the nearest `shotdoc.config.yaml` found by looking in the source file's directory, then each parent directory above it.
3. Otherwise `shotdoc.config.yaml` in the directory you run `shotdoc` from, if there is one.

When the file used is not in the directory you run `shotdoc` from, the build says so (`Using examples/todomvc/shotdoc.config.yaml`), so a file picked up from a parent directory is never a surprise. A relative `outDir` is resolved against the directory holding the config file, so the same file writes to the same place wherever you run the build from.

```yaml
baseUrl: https://demo.example.test   # context root for `goto` paths (see below)
outDir: build                        # default: build
viewport: { width: 1280, height: 800 }   # defaults
deviceScaleFactor: 2                 # default
```

Rendering always uses locale `en-US` and timezone `UTC`.

### Base URL and `goto`

A `goto` that is not a full URL is a *context path*: it is resolved against `baseUrl` treated as a directory. So `/` is the base URL itself (the application's context root), not the host's root, and `/login` goes to the base URL's path followed by `login`. A trailing slash on `baseUrl` makes no difference:

| `baseUrl` | `goto` | Goes to |
| --- | --- | --- |
| `https://demo.example.test` | `/login` | `https://demo.example.test/login` |
| `https://demo.example.test/todos/` | `/` | `https://demo.example.test/todos/` |
| `https://demo.example.test/todos` | `/login` | `https://demo.example.test/todos/login` |
| `https://demo.example.test/todos/` | `https://other.example.test/x` | `https://other.example.test/x` |

This differs from standard URL resolution, where `/` means the host's root. To reach something outside the base URL's path, write a full URL.

## Blocks

A block is a fenced code block whose info string is `shotdoc`. Its body is a YAML list of steps. A block must be at the top level of the document (not inside a list or quote) and takes no attributes yet; `js`, `state=` and `save=` are reserved and rejected.

All blocks in a document share one browser session: a later block continues on the page the earlier one left. Every build starts with a clean browser (no cookies or storage).

```shotdoc
- goto: /
- screenshot: {name: home}
```

### Steps

| Step | Form |
| --- | --- |
| `goto` | `- goto: /path` or a full URL |
| `click` | `- click: <target>` |
| `dblclick` | `- dblclick: <target>` |
| `hover` | `- hover: <target>` |
| `unhover` | `- unhover:` (no value) |
| `fill` | `- fill: {target: <target>, value: "text"}` |
| `press` | `- press: Enter` or `- press: {key: Escape, target: <target>}` |
| `wait` | `- wait: <condition>` (see below) |
| `screenshot` | `- screenshot: {name: ..., target: ..., include: [...], padding: 16, alt: "..."}` |

### Targets

A target is exactly one element. It matches one element or the step fails, and the message says how many matched.

```shotdoc
- goto: /form.html
- click: "#save"
- click: {role: button, name: Save}
- click: {text: Next page}
- fill: {target: {label: Email}, value: ada@example.test}
```

- a string is a selector in Playwright's selector syntax: CSS, plus extensions such as `:has-text()`, `:nth-child()`, `>>` chaining, and `role=` (see below)
- `{role: button, name: Save}` matches by ARIA role and (optionally) accessible name
- `{text: ...}` matches by visible text
- `{label: ...}` matches a form control by its label

Role, name, text and label matching is by case-insensitive substring. Prefer role and text over CSS selectors where you can; they survive markup changes better.

#### Picking one of several similar elements

A target must match exactly one element, but pages often repeat elements: a list of rows, each with a checkbox of the same name. Role and text targets match all of them, so narrow the match with a selector string:

```shotdoc
- goto: /rows.html
- click: "li:has-text('Take screenshots') >> role=checkbox"
- click: "ul > li:nth-child(3) input.toggle"
```

The first picks the checkbox inside the row that contains that text. The second picks by position, which is simpler but breaks if rows are reordered.

YAML needs quoting for these selectors. A selector containing a colon (`:has-text(...)`), `>>`, or quote characters must be in quotes. Use double quotes around the selector and single quotes inside, as above, or the reverse. A selector with a syntax error fails the step when it runs, and the message names the selector.

### Pressing keys

`fill` types into a field but does not submit it. Many pages act only on a key press, such as Enter to add an item, so follow `fill` with `press`:

```shotdoc
- fill: {target: {role: textbox, name: What needs to be done}, value: Buy milk}
- press: Enter
```

A bare key goes to whatever has focus, which is the field you just filled. To focus an element first, use the mapping form:

```shotdoc
- press: {key: Escape, target: {role: textbox, name: Edit}}
```

A key is a single character (`a`) or a key name such as `Enter`, `Escape`, `Tab`, `Backspace`, or `ArrowDown`, optionally with modifiers joined by `+`: `Control+A`, `Shift+Tab`. Names are Playwright's key names. A misspelled name fails the step when it runs and the message names the key. Quote a key that YAML would read as a number or a boolean: `press: "1"`.

### Double-clicking and hovering

`dblclick` and `hover` take the same targets as `click`. Use `dblclick` for controls that react only to a double-click, such as an item that turns into an edit field. Use `hover` for controls that appear only while the pointer is over something, such as a delete button on a row:

```shotdoc
- goto: /rows.html
- hover: {text: Ship it}
- screenshot: {name: delete-control, target: "li:has-text('Ship it')"}
```

The pointer stays where the last pointer step left it. `hover`, `click`, and `dblclick` all move it, and nothing moves it away otherwise, so the hover state is still there in later screenshots, including those in later blocks. This also means a hover effect can appear without a `hover` step: after you click a row's checkbox, the pointer is still over that row, so its delete button is showing in the next screenshot. To end a hover, use `unhover`. It takes no value and moves the pointer to the top-left corner of the page, which is almost always empty:

```shotdoc
- click: {role: checkbox, name: Toggle Todo}
- unhover:
- screenshot: {name: ticked}
```

If something on your page reacts to the corner, `hover` over a neutral element instead.

### Screenshots

Without a `target`, the screenshot is the current viewport. With a `target`, it is that element plus `padding` (CSS pixels, default 16), limited to the page. `include` adds more elements: the image is the smallest rectangle containing all of them.

```shotdoc
- goto: /menu.html
- screenshot:
    name: header-and-menu
    target: "#header"
    include: ["#menu"]
    padding: 8
    alt: The header with its menu open
```

`name` uses letters, digits, hyphens, and underscores and must be unique in the document. `alt` becomes the image's alt text (default: the name).

Before capturing, shotdoc waits for the target and every included element to be visible and to stop moving. It does not move the viewport size; it scrolls instead. Only a region larger than the viewport is captured beyond it.

A screenshot whose image is one colour throughout fails the build, with the screenshot's name and the colour in the message. That is almost always a page that has not rendered yet: add a `wait` for something that appears when the page is ready. A solid-colour element captured with `padding: 0` is also one colour; leave the default padding so the page around it is in the image.

### Waiting

Clicking returns before the page has necessarily updated. When a screenshot should show the result of an action, wait for something that proves the page is ready:

```shotdoc
- goto: /delayed.html
- click: "#update"
- wait: {text: 2 items left}
- screenshot: {name: updated}
```

`wait` takes exactly one condition:

- `{visible: <target>}` / `{hidden: <target>}`
- `{text: "..."}` — the text appears on the page
- `{network: idle}` — no network requests for a short while
- a number — milliseconds (a last resort)

Every wait gives up after 10 seconds and the build fails with the condition named.

## Known limits

- The timeout is fixed at 10 seconds.
- Regions larger than the viewport are captured by resizing the page, which can blank apps that re-render on resize or scroll an inner container.
- CSS animations and transitions are settled before each screenshot, but motion driven by script (an animation loop, a timer that changes the page) is not frozen, so a page with such motion can give different images on different builds.
- Pixel-identical output across different machines is not guaranteed.
- Only an image that is one colour throughout is rejected as blank. A page that is partly blank, such as an empty panel inside a populated page, is not detected.
- No annotations, hiding or masking, named login states, JavaScript blocks, HTML output, or caching yet.
