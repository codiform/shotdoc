# Design

## Context

Greenfield: the repository contains only OpenSpec scaffolding, so there are no existing modules, conventions, or tests to fit. See proposal.md for motivation and the specs for required behavior. Playwright is the browser engine; this drives the choice of Node/TypeScript.

Prior art informing the design: shot-scraper (YAML-driven Playwright screenshots, selector crop, injected JS and SVG for annotation, an `auth` command that saves storage state) and notebook-style tools (execute blocks in order, splice output in place). Doxer's differences are a persistent session across blocks, a prose-first source document, and first-class annotation helpers instead of hand-written JS.

## Goals / Non-Goals

**Goals:**
- A pipeline simple enough to reason about: parse, execute in order against one session, emit.
- Annotation and masking helpers good enough that authors rarely need the `js` escape hatch.
- Reproducible images, so rebuilds produce clean diffs.
- A spike that proves screenshot quality and determinism before the syntax is treated as stable.

**Non-Goals:**
- HTML rendering and templating (a separate later change; Pandoc `--template` is the leading candidate).
- Incremental rebuilds and caching.
- Programmatic login for CI (interactive login only in this change).
- Cross-browser support; Chromium only.
- Annotation shapes beyond highlight, arrow, and numbered badge.

## Decisions

### Pipeline: parse, execute, emit

```
source.md --> [parse] --> segments: prose | block(attrs, body, line)
                               |
                               v
                    [execute blocks in order]
                    one SessionManager, one browser
                               |
              screenshots (PNG) + per-block image refs
                               |
                               v
                 [emit] built.md + images/   (source untouched)
```

Parsing uses a real Markdown parser (a CommonMark-compliant one) rather than regex, and splices output by source position so non-block content passes through byte-for-byte. *Alternative considered:* a Pandoc Lua filter. Rejected because each block would run as a separate process, losing session continuity. Pandoc remains attractive as the downstream HTML renderer.

### Block syntax

- Info string: `doxer` followed by attributes: `js`, `state=fresh|<name>`, `save=<name>`. Unknown attributes are an error (fail early, catches typos).
- Default body is a YAML list of single-key steps (`- goto: /login`). A `screenshot` step takes a name and options (`selector`, `padding`, `fullPage`).
- A `js` body is an async function body receiving `page` (the Playwright page) and a `doxer` helper object exposing the same capture and annotation operations as YAML steps, so the two block types share one implementation.
- Fence-header attributes (rather than body keys) so state control works identically in both block types.

*Alternative considered:* separate fence languages (`doxer` and `doxer-js`). Rejected because the state attributes would have to be duplicated and "which kind is this" is a property of the block, not of its language.

*Alternative considered:* a Playwright-script-only approach. Rejected: authors would write code to say "go to the login page and take a picture".

### Session management

A single `SessionManager` owns one Chromium browser per build and one current context and page.

- Default: reuse the current context and page.
- `state=fresh`: close the current context, open a new empty one.
- `state=<name>`: close the current context, open a new one with Playwright `storageState` loaded from the named file. No page is open, so the block must begin with navigation; this is intentional, and it makes each section independently startable.
- `save=<name>`: after the block succeeds, write `context.storageState()` to the named file.

Named states are files under a `.doxer/states/` directory (name configurable). They contain session cookies, so they are treated as secrets: never copied into output, and the tool warns or ignores them in version control when first created.

*Alternative considered:* replaying all preceding blocks to reach a section. Rejected as slow and fragile; named states give the same checkpoint without replay.

### Detecting expired state

Storage state carries no reliable expiry signal, so validity is author-supplied. A state declared in the config file may include a `check`: a URL and an expected element. When a block loads that state, the check runs first; failure aborts the build with a refresh instruction. States with no declared check load without verification and rely on the author noticing; the config documents this.

*Alternative considered:* inspecting cookie expiry timestamps. Rejected as insufficient: servers invalidate sessions independently of cookie dates.

### Annotations as an overlay layer

Annotations are injected DOM in a single overlay container: fixed to the document, `pointer-events: none`, high z-index, and outside normal flow so it cannot shift layout. Each annotation reads its target's `getBoundingClientRect()` at the moment of capture. This follows shot-scraper's approach (real DOM, captured by the browser) but replaces hand-positioned SVG and `setTimeout` with locators and Playwright's auto-waiting.

Element captures use a clip computed as the union of the element's bounds and any annotations attached to it, plus padding, clamped to the page. Otherwise an arrow pointing in from outside the element would be cropped away.

*Alternative considered:* post-processing images (drawing with an image library). Rejected for the first version: it needs coordinate translation from page to image, and loses automatic tracking of layout. Retained as an option for later annotation types that are hard to express in DOM.

### Hiding and masking

`hide` applies `visibility: hidden` (layout preserved) to matched elements. `mask` uses Playwright's screenshot `mask` option, which paints a solid box over matched locators. Both are cleared with the session's other annotations.

### Stable rendering

Fixed viewport and device scale factor from config (defaults chosen in the spike), `animations: "disabled"`, `caret: "hide"`, a fixed locale and timezone on each context. Fonts remain environment-dependent; this is the main determinism risk (see below).

### Output layout and naming

Default output directory is separate from the source (for example `build/`). Images are written to `<out>/images/<document-name>/<screenshot-name>.png`; names must be unique within a document, and duplicates are an error. Built Markdown links to them by relative path. Output beside the source is permitted by config, but never to the source file path itself.

### Configuration

A `doxer.config.yaml` supplies base URL, viewport, scale, output directory, and named-state declarations (including optional `check`). Everything has a default except base URL, which is required only when a relative `goto` is used.

### Spike as first work

The first implementation task is a throwaway-quality spike on three public sites to answer: can crop, annotate, and mask reach publishable quality; are two consecutive runs visually identical; does save-then-reuse of state work headlessly. Its results feed back into defaults and any syntax changes before the rest of the build is hardened. Sites: saucedemo.com (auth and post-login crops), play.grafana.org (dynamic content and determinism), demo.playwright.dev/todomvc (multi-step walkthrough, continue versus fresh). Optional fourth: reproduce the annotated Datasette menu from shot-scraper's announcement using helpers.

## Risks / Trade-offs

- **Determinism fails because of fonts, GPU, or OS differences** [likely] → Pin Chromium via Playwright, record viewport and scale in config, and treat the spike's identical-output check as a gate. If byte-identical is unreachable, define "visually identical" through a pixel-diff threshold and document it. CI builds in a container may be needed for cross-machine stability.
- **Third-party sites change, breaking the spike's sites** → Spike sites are demos intended for experimentation; failures are informative rather than blocking. Keep spike documents in the repo so they can be rerun.
- **Selectors drift when the app changes** → That is the point of the tool failing loudly; error messages must name file, line, step, and selector (specified in doc-build).
- **Saved state leaks credentials** → Excluded from output by design, ignored in version control by default, documented as secrets.
- **Annotation overlay is affected by page CSS or stacking contexts** → Use a very high z-index and an isolated container; the `js` escape hatch covers pathological pages.
- **Continue-by-default hides ordering dependencies** → Authors can opt into `state=fresh` per section; reviewers see state attributes in the block header.
- **Blocks run strictly in order against one page, so no parallelism** → Accepted for now; documents are small, and ordering is the feature.

## Open Questions

- Rebuild and caching model: deferred. Skipping unchanged sections would need block hashing plus assumptions about site stability.
- Exact option names for annotation steps (for example `arrow: {to: ..., from: left}` versus alternatives) will be settled during the spike.
- How HTML templating plugs in (Pandoc invocation owned by doxer, or a documented separate step) is a later change.
