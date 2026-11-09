# Proposal

## Why

Shotdoc exists so that documentation screenshots are produced by instructions embedded in the documentation itself, and stay current when the UI changes. The spike (`openspec/changes/archive/2026-11-08-spike-screenshot-quality/findings.md`) showed the approach is viable: element crops, stable output, and continuous sessions all worked. Nothing yet turns a Markdown file into built documentation. This change builds the thinnest end-to-end version, so every later capability (annotations, `js` blocks, saved logins) has a working pipeline to extend, and so the earliest feedback comes from a real build rather than a plan.

## What Changes

- Introduce **shotdoc** as a Node/TypeScript package built on Playwright, with a build command that reads a source Markdown file and writes built Markdown plus images to a separate output location.
- Recognise fenced `shotdoc` blocks whose bodies are YAML steps, executed in document order. Supported steps: `goto`, `click`, `fill`, `wait`, and `screenshot`.
- Run each document in **one continuous browser session**: the first block starts in a new empty context, and each later block continues where the previous one ended. A simple walkthrough never mentions state.
- Support screenshots of the viewport or of an element, with padding, and with extra regions that can be included in an element crop. Clips are snapped to whole pixels and use the viewport when they fit.
- Add a **settle strategy** so a screenshot is not taken before the page has finished updating (the spike observed a click returning while the UI still showed the old state).
- Apply **stable rendering defaults** to every capture: fixed viewport and device scale, fixed locale and timezone, disabled animations, hidden caret.
- Read a minimal `shotdoc.config.yaml` (base URL, output directory, viewport defaults).
- **Never modify the source**, name image files deterministically, keep unbuilt source readable as ordinary Markdown, and fail clearly: errors name the file, line, step, and locator, and a failed build is never reported as successful.
- Reject attributes that later changes will define (for example `state=` and `js`) with a clear "not supported yet" message, so adding them later is compatible.

### Out of scope

Annotations (highlight, arrow, badge), hiding and masking, freezing dynamic data, the blank-capture guard and determinism checks, `js` blocks, named states and saved logins, front matter, HTML rendering, and rebuild caching. These are planned as separate changes; see the roadmap note in `openspec/changes/doxer-screenshot-docs-builder/proposal.md`.

## Capabilities

### New Capabilities
- `doc-build`: Parsing source Markdown, executing blocks in document order, and emitting built Markdown plus images to a separate output without altering the source; failure reporting; deterministic output paths.
- `block-language`: The block syntax for this change: `shotdoc` fenced blocks with YAML steps, relative URL resolution against a base URL, and rejection of attributes not yet supported.
- `session-state`: The simple session model only: one continuous session per document, the first block starting clean. Later changes extend this capability with named states and login.
- `screenshot-capture`: Plain screenshots: viewport and element capture, padding, extra regions, whole-pixel snapping, a settle strategy, and stable rendering defaults. Later changes extend this capability with annotations and determinism checks.

### Modified Capabilities
<!-- None: the main specs are empty. -->

## Impact

- New Node/TypeScript package at the repository root; the repository currently contains only OpenSpec scaffolding and the throwaway `spike/` directory. Nothing in `spike/` is imported; it is reference only.
- New dependencies: Playwright and its Chromium build, a Markdown parser, a YAML parser.
- New CLI surface: a build command.
- Builds drive real websites over the network, so a document's output depends on those sites staying available and stable. The spike saw a public demo page disappear (HTTP 404), so error messages must make the failing step and locator obvious.
- The earlier bundled draft (`doxer-screenshot-docs-builder`) is source material for the specs and design of this change; where it conflicts with the spike's findings, the findings win.
