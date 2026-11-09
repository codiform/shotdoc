# shotdoc

Write documentation in Markdown, drive a real browser from fenced `shotdoc` blocks, and build the result: each block is replaced by the screenshots it took.

The source file stays valid Markdown. Without building, a `shotdoc` block just renders as a code block, so the source is still readable.

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

Optional `shotdoc.config.yaml` in the directory you run `shotdoc` from. Unknown keys are an error.

```yaml
baseUrl: https://demo.example.test   # used to resolve relative `goto` URLs
outDir: build                        # default: build
viewport: { width: 1280, height: 800 }   # defaults
deviceScaleFactor: 2                 # default
```

Rendering always uses locale `en-US` and timezone `UTC`.

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
| `fill` | `- fill: {target: <target>, value: "text"}` |
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

- a string is a CSS selector
- `{role: button, name: Save}` matches by ARIA role and (optionally) accessible name
- `{text: ...}` matches by visible text
- `{label: ...}` matches a form control by its label

Role, name, text and label matching is by case-insensitive substring. Prefer role and text over CSS selectors where you can; they survive markup changes better.

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
- Pixel-identical output across different machines is not guaranteed.
- No annotations, hiding or masking, named login states, JavaScript blocks, HTML output, or caching yet.
