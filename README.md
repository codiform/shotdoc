# shotdoc

Write documentation in Markdown, drive a real browser from fenced `shotdoc` blocks, and build the result: each block is replaced by the screenshots it took.

The source file stays valid Markdown. Without building, a `shotdoc` block just renders as a code block, so the source is still readable.

> **Early release.** shotdoc is usable, but it is not yet stable: it is below 1.0, and a minor version may change or break things. Pin the version you test with.

## Install

Requires Node.js 22 or later and the Chromium browser used by Playwright:

```sh
npm install --save-dev shotdoc
npx playwright install chromium
```

Install the browser from the same project as shotdoc, so it matches the Playwright version shotdoc uses. Run it as `npx shotdoc`; the examples below write plain `shotdoc`.

## Example

[`examples/todomvc/`](examples/todomvc/) documents the Playwright TodoMVC demo app:

- [`input/todo-mvc.md`](examples/todomvc/input/todo-mvc.md) is the source you write.
- [`output/todo-mvc.md`](examples/todomvc/output/todo-mvc.md) is what `shotdoc build` produces, with its screenshots in [`output/images/`](examples/todomvc/output/images/todo-mvc/).
- [`shotdoc.config.yaml`](examples/todomvc/shotdoc.config.yaml) sets the base URL and output directory.

To rebuild it from a clone of the repository, run this from the project root. The build finds the example's config file above the source and writes the output beside it:

```sh
shotdoc build examples/todomvc/input/todo-mvc.md
```

[`examples/datasette/`](examples/datasette/) documents a table in Datasette's public demo and shows the annotation and masking features: an arrow beside an open menu, numbered badges on a form, and the footer's changing query time masked. Rebuild it the same way, with `shotdoc build examples/datasette/input/datasette.md`.

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
auth:                                # optional: an app behind a login (see below)
  url: /login
  check: { url: /dashboard, visible: { role: heading, name: Dashboard } }
  state: .shotdoc/auth.json          # default
```

`auth` describes a login you do by hand with `shotdoc login`; see [Documenting an app behind a login](#documenting-an-app-behind-a-login). `url` is where the login starts. `check` is required: one `visible` target or `text` that appears only when you are logged in, on the page `check.url` (default: `url`). `state` is where the saved session goes, resolved against the config file's directory (default `.shotdoc/auth.json`).

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
| [`goto`](#base-url-and-goto) | `- goto: /path` or a full URL |
| [`click`](#targets) | `- click: <target>` |
| [`dblclick`](#double-clicking-and-hovering) | `- dblclick: <target>` |
| [`hover`](#double-clicking-and-hovering) | `- hover: <target>` |
| [`unhover`](#double-clicking-and-hovering) | `- unhover:` (no value) |
| [`fill`](#targets) | `- fill: {target: <target>, value: "text"}` |
| [`press`](#pressing-keys) | `- press: Enter` or `- press: {key: Escape, target: <target>}` |
| [`wait`](#waiting) | `- wait: <condition>` (see below) |
| [`screenshot`](#screenshots) | `- screenshot: {name: ..., target: ..., include: [...], hide: [...], mask: [...], maskColor: "#555", annotate: [...], defaults: false, padding: 16, alt: "..."}` |

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

### Hiding and masking

Some things should not be in a screenshot: an account name, an avatar, a date that changes every day, a banner that is not part of what you are documenting. A screenshot can leave them out with two lists of targets:

```shotdoc
- goto: /rows.html
- screenshot:
    name: list
    target: body
    hide: ["#banner"]
    mask: ["li .date", {role: img, name: Avatar}]
    maskColor: "#999"
```

- `hide` makes the elements invisible. They keep their space, so nothing around them moves: where a banner was, the image shows an empty band of the page background.
- `mask` covers the elements with a solid block of one colour. The block is grey (`#555555`) unless you give `maskColor`, which can be any CSS colour. It works for a region larger than the viewport too.

Targets are the same forms as everywhere else, with one difference: a `hide` or `mask` target may match several elements, and all of them are hidden or masked. That makes it easy to mask a date in every row. It must match at least one element. Shotdoc waits for one to appear, and the step fails if none does, so a selector that stops matching after a page change does not quietly leave the data in the image.

Both apply to that one screenshot only. The page is put back afterwards, so later screenshots show the elements as normal. To leave the same element out of every screenshot in a document, declare it once as a [default](#defaults-for-every-screenshot).

Masking removes the content from the image, so it does not suit a screenshot meant to show that content. If an image is one colour throughout after masking (a mask covering everything captured), the build fails as for any blank image, and the message mentions the mask.

### Defaults for every screenshot

When the same element should be hidden or masked in every screenshot of a document, declare it once in the document's front matter, under `shotdoc.defaults`:

```yaml
---
title: Using the app
shotdoc:
  defaults:
    hide: [{text: This is just a demo}]
    mask: ["#account-name"]
    maskColor: "#999"
---
```

The front matter is the YAML block at the very start of the file, between two lines of `---`. Shotdoc reads only the `shotdoc` key; anything else in it, such as a `title` for your site generator, is ignored.

- `hide`, `mask` and `maskColor` take the same values as on a screenshot and apply to every screenshot in the document.
- A screenshot's own `hide` and `mask` are added to the defaults, not instead of them. A screenshot's own `maskColor` wins over the default one.
- A screenshot that should show everything sets `defaults: false`. That drops all the defaults for that screenshot, and its own `hide` and `mask` still apply.
- `annotate` is not a default: annotations are set on each screenshot.

A default target does not have to match anything. If it matches nothing on the page, or only matches elements outside the captured image, the screenshot is taken as usual, so a default for a banner that is on some pages and not others is fine. The price is that defaults are never waited for: one applies to whatever is on the page when the screenshot is taken, and an element that has not appeared yet is missed. Put a target you need waited for, and checked, in the screenshot's own `hide` or `mask`.

The built document leaves out the `shotdoc` key, since it is build configuration and not something readers need (if it was the only key, the whole front matter goes). Any other front matter keys are kept exactly as written. Defaults for a whole project in `shotdoc.config.yaml`, and ones that apply from a point in the document onwards, are not available yet.

### Annotating

To point at something in a screenshot, give it an `annotate` list. Each item has one key, naming what to draw, and its value is the element to draw it on:

```shotdoc
- goto: /rows.html
- screenshot:
    name: toolbar
    target: ".toolbar"
    annotate:
      - highlight: {role: button, name: Save}
      - arrow: {target: "#export", from: right}
      - badge: {target: {text: Delete}, color: "#0a0"}
```

- `highlight` draws a box around the element.
- `arrow` draws an arrow beside the element, pointing at it. `from` is the side it sits on: `left` (the default), `right`, `top` or `bottom`.
- `badge` draws a numbered circle on the element's top-left corner. Badges are numbered 1, 2, 3 in the order you list them, so write what each one means in the text next to the image ("1 is the delete button"). There is no text label option on purpose: a numbered badge and a sentence avoid text that does not fit and can be translated with the rest of the page.

The value is a target in any of the usual forms, or a mapping with `target` and options. Every kind takes `color` (any CSS colour). The default is pink, and each annotation has a white outline so it shows on light and dark pages alike. An annotation's target must match exactly one element, and shotdoc waits for it to be visible, as for the screenshot's own target.

`annotate` needs a `target` on the screenshot. The image grows to include every annotation: an arrow that points in from outside the target is not cropped away, and `padding` is added around the lot. A region cut off by the edge of the page is cut there.

Annotations apply to that one screenshot only and are removed afterwards, as `hide` and `mask` are. They do not change the page's layout. A `mask` is painted over them, so a masked element hides any annotation on it.

Badge numbers are drawn with the browser's `sans-serif` font, so they can differ between machines that have different fonts. An annotation on a fixed or sticky element can end up in the wrong place if the page has to scroll to fit the region.

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

## Documenting an app behind a login

Many apps need a login, often with a second factor, and the credentials must not end up in your project. shotdoc never sees them: you log in yourself, in a real browser window, and shotdoc keeps the resulting session for later builds.

Add `auth` to the configuration (see above), then:

```sh
shotdoc login guide.md      # or: shotdoc login --config shotdoc.config.yaml
```

A browser window opens at `auth.url`. Log in as you normally would, including any MFA, wait until the app has loaded, and press Enter in the terminal. shotdoc then runs the **check** and, only if it passes, saves the session. After that, `shotdoc build` starts every build from the saved session, runs the check again before the first block, and stays headless and non-interactive.

### The check

`check` is required, because a saved session can lapse without any error: an expired session often just shows a login page, and a build would happily screenshot it. The check loads a page (`check.url`, default `auth.url`) and waits for one thing that appears only when you are logged in, either a `visible` target or some `text`. Pick something the login page does not also show: a heading of the logged-in page, a "Sign out" link, your account menu. The HTTP status of the page is ignored, because some apps answer 404 for pages they render fine, so only what is on the page counts.

`check.url` can differ from `auth.url`. Some apps show the login page even when you are logged in, but redirect you to it from a private page. Check that private page instead.

### Where the session is kept

The session goes to `.shotdoc/auth.json` next to the configuration file, or to `auth.state` if you set it. It holds cookies and local storage: treat it as a secret, the same as your password. The file is readable only by you, shotdoc never writes it to the output or prints its contents, and `shotdoc login` warns if git would not ignore it. Add `.shotdoc/` to your `.gitignore`. The session must not be inside `outDir`, which is meant for publishing: such a configuration is rejected. A build never changes the file. To log in again, for example as another user, run `shotdoc login` again; it replaces the file.

### When the login has lapsed

If the saved session is missing, unreadable, or fails the check, the build stops before any block runs, writes nothing, and exits with status 3, so a script can tell "log in again" from other failures. The message names the check and the command to run. Some identity providers end sessions within hours, so expect to run `shotdoc login` again before a build session; a saved session is not something to rely on for unattended, regular builds.

### Limits

- Only cookies, local storage and IndexedDB are saved. An app that keeps its login in `sessionStorage` will fail the check; that is reported rather than documented as a login page.
- A session can expire in the middle of a build, after the check. The build then fails on whatever step first needs the page.
- Your name and data appear in the screenshots. Use `hide` or `mask`, or [document defaults](#defaults-for-every-screenshot), for anything personal.
- A document cannot start logged out and log in itself, or change user midway.

[`examples/the-internet/`](examples/the-internet) documents a page behind a login on a public practice site. In a clone of the repository, run `shotdoc login examples/the-internet/input/secure-area.md` (the page prints its username and password), then build it.

## Known limits

- The timeout is fixed at 10 seconds.
- Regions larger than the viewport are captured by resizing the page, which can blank apps that re-render on resize or scroll an inner container.
- CSS animations and transitions are settled before each screenshot, but motion driven by script (an animation loop, a timer that changes the page) is not frozen, so a page with such motion can give different images on different builds.
- Pixel-identical output across different machines is not guaranteed.
- Only an image that is one colour throughout is rejected as blank. A page that is partly blank, such as an empty panel inside a populated page, is not detected.
- A document that starts logged out, switches user, or logs in with stored credentials; JavaScript blocks, HTML output, or caching yet.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for how to set up, test and change shotdoc, and the [MIT license](LICENSE) for how you can use it.
