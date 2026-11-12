# Proposal

## Why

Screenshots should be trustworthy without the author having to check each one. Two things can still go wrong silently (GitHub issue #3, and the spike findings in the archived `spike-screenshot-quality` change):

- **A blank image can be written as if it were fine.** The spike's first Grafana runs were byte-identical only because every panel was empty ("identical can mean blank"). Today shotdoc will write a fully blank or single-colour image, for example from a page that has not rendered yet, and nothing tells the author.
- **Repeatability is not guarded.** The spike showed that two runs on one machine are byte-identical once rendering is stable, but nothing in the repository checks that, so a later change could break it unnoticed.

The issue also asks to freeze animations and transitions and hide the caret. That is already done: `core-build-pipeline` settles CSS animations and hides the caret on every capture (the "Stable rendering" requirement). Probing what that leaves uncovered (see the design) showed that CSS infinite animations and transitions are stable, and script-driven motion is not. Freezing script-driven motion is a larger decision and is left out here.

## What Changes

- Reject blank screenshots: after taking an image, check whether every pixel is the same colour. If so, fail the step with a message that names the screenshot and the target, says the image is blank, and suggests waiting for the page to finish loading. No image is kept for a failed screenshot. This applies to every screenshot, viewport or element.
- Guard repeatability: a test builds a small document twice against fixture pages, including one with a CSS animation that never ends and a CSS transition, and requires every image to be byte-identical. The same promise is added to the spec for a page whose content does not change.
- Document both in the README, including the limits: the guard catches only a completely single-colour image, and script-driven animation is not frozen.
- `pngjs` becomes a runtime dependency (it is a development dependency today), because the guard decodes the PNG.

## Out of scope

- Freezing script-driven motion (`requestAnimationFrame` loops, timers that change the page). Pausing the page clock works in a probe, but it means fake timers for the whole session, which can change how real sites behave. A separate issue can decide that.
- Freezing data by recording and replaying network responses (the spike's "freeze" for Grafana). No issue covers it yet; it is not part of #3 as written.
- Hiding or masking elements (#2) and annotations (#1).
- An opt-out for the blank check, and detecting a partly blank image (such as an empty panel inside a populated page), which needs a content-aware check.
- Pixel-identical output across machines, operating systems or containers.
- Waiting for web fonts or lazy-loaded images before capture.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `screenshot-capture`: two requirements are added, rejection of blank captures and repeatable output.

## Impact

- **Code:** the screenshot capture in `src/run/capture.ts` takes the image into memory, checks it, then writes it; a small image check module is added.
- **Tests:** unit tests for the blank check, fixture tests for the guard through the runner (blank page, solid element, default padding), and a repeatability test that builds a document twice.
- **Docs:** the README screenshots section and known limits.
- **Dependencies:** `pngjs` moves from development to runtime dependencies.
- **Compatibility:** documents that produce a completely single-colour image now fail where they used to succeed. The usual case is a mistake the author wants to know about. A deliberate solid-colour element captured with padding 0 would fail; the workaround is padding, which brings in the page around it.
