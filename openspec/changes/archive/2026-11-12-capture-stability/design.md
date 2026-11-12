# Design

## Context

See proposal.md for motivation. `takeScreenshot` in `src/run/capture.ts` hands Playwright a file path and options (`animations: 'disabled'`, `caret: 'hide'`, scale `device`), so the image goes straight to disk and nothing looks at it afterwards. Runner errors are caught in `runBlock`, which attaches the file, block line, step number and target to the message, so a plain `ShotdocError` thrown from the capture gets its location for free.

What the spike recorded (archived `spike-screenshot-quality` findings): "identical can mean blank", two builds on one machine were byte-identical in every scenario with stable rendering, and animation disabling is applied only at capture time.

**What the existing animation handling covers.** To check what issue #3's "freeze animations" still needs, I took six screenshots 37 ms apart of small pages, with the capture options the tool uses today:

| Page | Distinct images in six shots |
| --- | --- |
| CSS infinite animation (spinning box) | 1 |
| CSS transition started after load | 2 (the first shot came before the page's script started the transition) |
| `requestAnimationFrame` loop moving a box | 6 |
| `setInterval` toggling visibility | 2 |
| `scroll-behavior: smooth` page | 1 |

So CSS animations and transitions are already stable, and script-driven motion is not. A second probe paused the page clock (`page.clock.install()` then `pauseAt`) and the same script-driven pages gave one distinct image in six shots, with the page animating again after `resume`. That works, but it installs fake timers for the whole session. That changes `Date` and timers for every page the tool visits, so it is left for a separate decision.

## Goals / Non-Goals

**Goals:**
- A silent blank image becomes a clear failure that says what to do.
- Repeatability on one machine is a tested promise, not just an observation.
- The guard never needs the author to do anything for ordinary pages.

**Non-Goals:**
- Content-aware checks (a populated page with an empty panel in it).
- Freezing script-driven motion or recording network responses; see the proposal.
- An opt-out for the blank check; see the decision below.

## Decisions

### The blank check is "every pixel is the same colour"
After the capture, decode the PNG and compare every pixel to the first, on red, green, blue and alpha. One different pixel anywhere means it is not blank. It runs for every screenshot, viewport or element, because a blank viewport is the commonest case and a blank element is just as useless.

The check is exact on purpose. Near-blank detection (a mostly white page with a tiny logo) would need a threshold that is wrong for some documents, and the failure the guard exists for, a page that has not rendered, produces an exactly uniform image. This also means it does not catch the spike's partly blank Grafana panels (a frame around empty panels is more than one colour). That needs a content-aware check and is out of scope.

*Alternatives considered:* a threshold on the number of distinct colours (rejected: arbitrary, and the spike's blank panels still had hundreds of colours); comparing compressed size (rejected: depends on the encoder and says little about content).

### The image is taken into memory, checked, then written
`takeScreenshot` stops passing `path` to Playwright, takes the returned buffer, runs the check, and writes the file only if it passes. That is how "no image is kept for a failed screenshot" holds without a delete step. The staged output directory is already thrown away when a build fails, so a blank image could not reach `outDir` either way, but the capture itself should not leave it behind.

The check lives in its own small module taking a PNG buffer, so it can be unit tested with images built in the test.

### Decoding needs `pngjs` at run time
`pngjs` is already a development dependency (used in tests). It becomes a runtime dependency. It is small, has no dependencies of its own, and is synchronous, which suits a check on one image at a time. Decoding a 2560x1600 image takes a few milliseconds.

*Alternative considered:* decode inside the browser (rejected: more moving parts, and the image is already outside the page).

### The message
`screenshot "<name>" is blank: every pixel is the same colour (<colour>). The page may not have finished loading; add a wait step for something that appears when it is ready.` The runner adds the file, block line, step number and target. The colour is included because "all white" and "all black" point at different causes.

### No opt-out for now
A deliberate solid-colour element captured with padding 0 would fail. The workaround is padding (the default, 16, brings in the page around the element), which is always more than one colour unless the page has the same colour as the element. An opt-out option on `screenshot` would add syntax, a spec change in `block-language`, and a decision about its name for a case that no real document has hit. If one does, it can be added without breaking anything.

Several existing tests do exactly this on purpose, because a solid fixture proves a crop covers exactly the element. Those fixtures and assertions change as part of the work (see tasks); the tests keep their meaning and the fixtures gain a second colour.

### Repeatability is tested by building twice
A test builds a small document twice through `build()` (so the whole path is exercised, including staging and writing), then compares every image byte for byte. The fixtures include a new page with an endless CSS animation and a CSS transition, plus ordinary pages, so the promise covers what `animations: 'disabled'` is for. The spec states the condition: pages whose content does not change. It does not promise anything for script-driven motion or live data, which the probe showed vary.

*Alternative considered:* comparing images within a tolerance (rejected: the spike found exact equality realistic, and a tolerance would hide drift).

## Risks / Trade-offs

- **False positive on a legitimately solid image** → Default padding avoids it, the message names the target, and an opt-out can be added later if it happens.
- **The guard gives a false sense of coverage** → The README states that only a completely single-colour image is caught.
- **`pngjs` becomes a runtime dependency** → Small, pure JavaScript; it is already in the lockfile.
- **Repeatability could be flaky across fixture pages** → Each fixture is static or CSS-only; script-driven pages are not in the test.
- **Existing tests rely on solid-colour captures** → They are updated in the first task group, and the guard's own tests then run alongside them.

## Open Questions

None.
