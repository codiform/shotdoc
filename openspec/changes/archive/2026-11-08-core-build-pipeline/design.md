# Design

## Context

Greenfield. The repository holds OpenSpec scaffolding and the throwaway `spike/` directory. See proposal.md for motivation and the specs for required behavior.

The spike (`openspec/changes/archive/2026-11-08-spike-screenshot-quality/findings.md`) supplies the proven building blocks: Playwright with fixed rendering settings, an element clip computed from bounding boxes (padding, clamping, whole-pixel snapping), a viewport-first capture that avoids resizing the page, and continue/fresh session behavior. The spike's code is reference only. This change reimplements what it needs, and nothing imports from `spike/`.

Constraints that shape the design:
- Builds drive real, third-party sites, so failures will be common. Error quality matters as much as the happy path.
- Later changes add annotations, `js` blocks, and named states. The step runner and block parser must be extensible without reworking their callers.
- Tests must not depend on live websites to pass.

## Goals / Non-Goals

**Goals:**
- A pipeline with one clear flow: load config, parse and validate everything, run steps in order against one session, emit.
- Failures that identify the file, block line, step, and target.
- Capture behavior covering each spike finding that applies to plain screenshots (settle, viewport-first, whole-pixel snapping, multi-region crops).
- A fixture-based test suite that reproduces the spike's problems locally.

**Non-Goals:**
- Annotations, hide and mask, freezing, the blank-capture guard, `js` blocks, named states, front matter, HTML output, and caching.
- Configurable timeouts, locale, or timezone.
- Any cross-machine pixel-stability guarantee (untested by the spike).
- Parallel execution of blocks or documents.

## Decisions

### Package and tooling
TypeScript, ESM, targeting Node 20 or later, built to JavaScript with a `bin` entry named `shotdoc`. Vitest for tests. Playwright is a runtime dependency (Chromium only).

*Alternative considered:* plain JavaScript like the spike. Rejected: the step model and error types benefit from types, and later changes add more step kinds.

Layout (indicative):
```
src/
  cli.ts          argument handling, exit codes
  config.ts       load and validate shotdoc.config.yaml
  parse/          markdown blocks, attributes, YAML steps, targets
  run/            session, step implementations, capture
  emit.ts         splice built document, stage and move images
  errors.ts       ShotdocError with location fields
test/
  fixtures/       local pages served over HTTP for tests
```

### Pipeline

```
 source.md --> [parse blocks] --> [validate all steps, names, config] --+
                                                                        |
                          any error: report all, exit 1, no browser <---+
                                                                        |
                                                                        v
                       [launch browser, new context] --> [run blocks in order]
                                                                |
                                          screenshots staged in a temp dir
                                                                |
                           step fails: exit 1, discard staged output, no built file
                                                                |
                                                                v
                              [emit built .md, move staged images into place]
```

### Markdown parsing
Use `markdown-it` (CommonMark) and read fenced blocks from its token stream, which carries each block's source line range and nesting level. Replacement works by splicing line ranges in the original text, so everything outside shotdoc blocks is preserved byte for byte, including line endings.

A fence whose token nesting level is above the top level is rejected (see the specs), which avoids having to re-indent images inside lists and blockquotes.

*Alternative considered:* an AST library (remark) with position offsets. Rejected for now as heavier than needed: only block-level line ranges are required.

### YAML and validation
Use the `yaml` package, which can report positions. Validate steps with small hand-written checks that produce specific messages (for example "step 3: unsupported step `hover`"), not a schema library. The messages are part of the product, and the step set is small.

All validation runs before the browser launches and reports every problem found, not only the first.

### Targets
A target is parsed once into a typed value and converted to a Playwright locator at run time: a string becomes a CSS locator, `{role, name}` becomes a role locator, `{text}` a text locator, `{label}` a label locator. Playwright's strict behavior (error on multiple matches) is kept, with the message rewritten to give the number of matches and the target.

Role and text names use Playwright's default matching (substring, case-insensitive). If that proves ambiguous in real documents, an `exact` option is an easy addition.

### Step execution
Each step kind is a function receiving a run context (page, config, staged screenshots) and its validated arguments. The runner wraps any thrown error with the block line, step number, and target or URL. New step kinds in later changes register in one table.

Timeout for every waiting action is a fixed 10 seconds.

### Settle strategy
Decision: no automatic global "settle". Readiness has two parts:

1. **Implicit, for captures.** A screenshot first waits for its target and every included element to be visible and then to stop moving (the bounding box unchanged across two consecutive animation frames).
2. **Explicit, for everything else.** The `wait` step covers conditions the tool cannot guess: element visible or hidden, text appearing, network idle, or a fixed delay. `click` and `fill` use Playwright's own actionability waits.

The motivating case from the spike: after clicking a filter, the URL changed and the list still showed the old items for a moment. The author writes `wait: {text: "2 items left"}` after the click.

*Alternatives considered:*
- **Wait for network idle after every action.** Rejected: apps with polling or long-lived connections (Grafana in the spike) never become idle.
- **Wait for a DOM quiet period after every action.** Rejected for now: it needs a magic duration, adds time to every step, and can still miss slow updates. It could return later as an opt-in `settle` option on screenshots.

### Capture algorithm
Ported in outline from the spike, with one addition:

1. Resolve the target and each included element (strict, visible, stable).
2. Scroll the target into view if needed.
3. Compute the region: the union of the target and included elements' bounding boxes, plus padding, limited to the page, rounded outward to whole CSS pixels.
4. If the region fits in the viewport, capture it as a plain viewport clip with no resizing. If it fits only after scrolling, scroll by the needed amount first and recompute.
5. Only if the region is larger than the viewport, capture beyond it using a full-page clip.

Every capture passes `animations: "disabled"` and `caret: "hide"` to Playwright.

Step 4's scrolling is **not proven by the spike**: its captures used elements already in view. It gets fixture tests (see Risks).

### Rendering defaults
One browser context is created with the viewport, device scale, locale `en-US`, and timezone `UTC`. Viewport and scale come from config (defaults 1280x800 at scale 2). Locale and timezone are fixed.

### Output staging
Images are written to a temporary directory inside the output directory while the build runs. On success the built Markdown is written and images are moved into place. On failure the temporary directory is removed and no built Markdown is written. This avoids leaving a mix of old and new images, and avoids deleting previous good output when a build fails.

Built image references use the screenshot's `alt` text, or its name when none is given. When a block produces several images, each is on its own paragraph in screenshot order.

### Configuration
`shotdoc.config.yaml` in the working directory, parsed strictly: unknown keys are an error. Keys: `baseUrl`, `outDir` (default `build`), `viewport` (`width`, `height`), `deviceScaleFactor`. A missing file is treated as empty. Relative paths resolve against the working directory.

### Testing strategy
- Unit tests for parsing, validation, target parsing, region math (padding, clamp, snap), and emit splicing.
- Integration tests run real Chromium against **local fixture pages** served by a small test HTTP server, so tests are fast and deterministic. Fixtures reproduce each spike finding: a page that updates a moment after a click (settle), an element sliding into place (readiness), a fractional-width element (whole-pixel snapping), a page whose content disappears if the viewport is resized (viewport-first), an element at the page corner (clamping), an element below the fold (scrolling), and a header with an open menu (included regions).
- Image assertions use PNG dimensions and a "not blank" check, never comparisons against stored golden images.
- A single optional smoke test builds the todomvc example against the live demo. It is excluded from the default test run.

## Risks / Trade-offs

- **Scroll-into-view capture is untested by the spike** → Dedicated fixtures (element below the fold, a region needing a scroll to fit, a scrolling inner container). If scroll-then-clip proves unreliable, fall back to the full-page capture for those cases and record the limitation.
- **Inner scroll containers** (as in Grafana) can hold a target that window scrolling cannot reach → Playwright's scroll-into-view handles most cases; if the region still does not fit, the full-page fallback may blank such apps. Documented as a known limit, with the `wait` and `js` (later change) escape routes.
- **A fixed 10-second timeout** is too short for slow sites and cannot be changed by authors → Accepted for the first increment. A `timeoutMs` config key is a small, compatible addition.
- **Substring role and text matching can match too many elements** → The error reports the count and the target, so the author can tighten the target. An `exact` option can follow.
- **Playwright's Chromium must be installed separately** → The build detects a missing browser and prints the install command, and the README states it as a prerequisite.
- **Live sites change or disappear** (the spike saw a demo page return 404) → Tests use local fixtures. User-facing errors name the URL, status, step, and target.
- **Nested shotdoc blocks are rejected** → A clear, early error; supporting indented blocks can be added later if authors need them in lists.
- **Pixel stability across machines is unknown** → Not a goal of this change. The determinism work belongs to the annotations-and-stability change.

## Open Questions

- Whether `include` should later accept a list shorthand or per-item options. The current form is a plain list of targets.
- Whether a DOM-quiet `settle` option is worth adding once real documents show how often explicit waits are needed.
- Whether to add `timeoutMs` and `exact` now or when first needed. Both are deferred; neither changes the specs written here.
