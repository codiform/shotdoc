# Proposal

## Why

Doxer is meant to turn Markdown with browser-driving blocks into documentation with screenshots. Whether that is usable at all depends on screenshot quality: element crops, annotations such as highlights and arrows, masking of dynamic content, and output that is identical across rebuilds. If rebuilds churn images or annotations need hand-tuning, the tool is not worth building as planned. These unknowns should be answered by evidence before any pipeline, block syntax, or spec is committed to, so that later changes are written from results rather than guesses.

## What Changes

- Run a time-boxed spike using Node/TypeScript and Playwright against three public demo sites, each chosen to test a different risk:
  - saucedemo.com: login, saving state, reusing it headlessly, and element crops of post-login screens.
  - play.grafana.org: masking or freezing dynamic content, and whether two consecutive runs produce visually identical images.
  - demo.playwright.dev/todomvc: a multi-step walkthrough with highlights, and the difference between continuing a session and starting fresh.
- Optionally reproduce the annotated Datasette menu screenshot from shot-scraper's announcement using annotation helpers instead of raw JavaScript.
- Record findings: what worked, what did not, the image-difference threshold needed, font and operating-system caveats, sensible default viewport and device scale, and which annotation approach (injected DOM overlay versus image post-processing) held up.
- Spike code is throwaway quality and is not the start of the real implementation. It is kept only as a reference for the findings.
- No product behavior is specified or shipped by this change.

### Success criteria

The spike answers these yes or no, with evidence for each:

1. Crops with padding of an element need no manual image editing.
2. A highlight and an arrow positioned from a locator appear correctly, and an arrow pointing in from outside the element is not cropped away.
3. Dynamic regions can be masked or frozen so they do not appear in images.
4. Two consecutive runs produce visually identical images, within a recorded threshold.
5. A login can be saved once and reused headlessly; a missing state fails clearly.
6. Continuing a session and starting fresh both behave as expected on a multi-step walkthrough.

### Out of scope

The Markdown parser, block syntax, build output, configuration file, interactive login command, validity checks for saved states, front matter, HTML rendering, and caching.

## Capabilities

### New Capabilities
<!-- None: this change produces findings, not behavior. -->

### Modified Capabilities
<!-- None. The change sets skip_specs because no spec-level behavior changes. -->

## Impact

- New throwaway code in a clearly separated spike directory; no existing code is affected (the repository contains only OpenSpec scaffolding).
- Dependencies: Node, Playwright and Chromium, and an image-diff library for the determinism check.
- Network use against third-party demo sites. No credentials beyond the public demo logins those sites publish.
- Saved login state from the spike is a session file; it is kept out of version control.
- Deliverable: a findings document that later changes (core pipeline, session state, annotations and stability) are written from.
