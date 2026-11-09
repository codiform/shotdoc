# Design

## Context

Greenfield repository; only OpenSpec scaffolding exists. See proposal.md for the motivation and the six success criteria. Prior art informing the approach is shot-scraper, which captures element screenshots after injecting JavaScript and DOM-based annotations into the page, and saves login state for reuse.

## Goals / Non-Goals

**Goals:**
- Answer each success criterion with evidence a reader can check (images, diff numbers, run logs).
- Learn which approach to annotation is viable, and what rendering settings make output stable.
- Leave a findings document that later changes can cite.

**Non-Goals:**
- Reusable library code, a CLI, or any design for the Markdown pipeline.
- Cross-browser or cross-operating-system coverage; Chromium on the developer's machine only, with the caveats noted.
- Polish: annotation looks only need to be legible.

## Decisions

### Layout
Spike code lives in a single directory (`spike/`) with one script per site plus a small shared helpers file. Output images go to `spike/out/`, and saved login state to `spike/.state/`. Both output and state are ignored by version control. Throwaway status is stated in the directory's README so nobody mistakes it for the product.

### Scripts, not a framework
Each site gets a plain Playwright script run with the Node runtime directly. Shared helpers are limited to what several scripts need (an annotation overlay, a screenshot wrapper, an image-diff runner). This keeps the spike fast, and keeps the helpers easy to judge for reuse afterwards.

### Annotation approach: DOM overlay first
Annotations are injected into the page as an overlay container that does not affect layout, positioned from each target's bounding box at capture time. For element crops, the clip is the union of the element and its annotations plus padding, so an arrow outside the element is included. Image post-processing is tried only if the overlay approach fails a criterion, which keeps the comparison honest without doing both for everything.

### Measuring determinism
Each scripted scenario runs twice in separate browser launches. The two images are compared with a pixel-diff library, recording the number of differing pixels and a pass or fail at thresholds of zero (byte-identical) and a small tolerance. The findings record which threshold is needed, and for which scenarios. Fixed viewport, device scale, locale, timezone, disabled animations and hidden caret are applied from the start so that failures point at the site or environment, not at missing settings.

### Saved state
The saucedemo script logs in with its publicly shown demo credentials, saves Playwright storage state, then a second script loads it headlessly and screenshots a post-login page. A third run with the state file removed must fail with a clear message, not screenshot the login page.

### Walkthrough sessions
The todomvc script runs several steps in one session, then a later step in a fresh context, to confirm the behavior the pipeline will depend on (continue versus fresh) without involving any Markdown parsing.

### Recording findings
Findings go in one document in the change directory as work proceeds: per criterion, a verdict, evidence (image paths, diff numbers), and notes. A final section lists recommended defaults and implications for the follow-on changes.

## Risks / Trade-offs

- **A demo site changes or goes down** → Informative rather than blocking; record the date and what was seen, and swap in an equivalent site if needed.
- **Determinism passes locally but would not across machines or in CI** → Record fonts and operating system in the findings; flag cross-machine stability as a follow-up rather than trying to solve it here.
- **Spike code is mistaken for production** → Isolated directory, README warning, and nothing outside it imports from it.
- **Scope creep into building the pipeline** → The success criteria and out-of-scope list in the proposal bound the work; anything beyond them is noted for later changes instead of built.
- **Live-data sites make "identical" impossible to judge** → Masking is part of what is being tested; criterion 4 is assessed with dynamic regions masked, and unmasked differences are recorded as evidence that masking is needed.
