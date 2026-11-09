# Tasks

## 1. Spike setup

- [x] 1.1 Create the `spike/` directory with a README stating it is throwaway code, and a minimal Node package; verify the README exists and `node --version` runs inside the directory
- [x] 1.2 Add Playwright and an image-diff library and install Chromium; verify a one-line script can launch headless Chromium, open a page, and exit cleanly
- [x] 1.3 Ignore `spike/out/`, `spike/.state/`, and `node_modules/` in version control; verify `git check-ignore` (or the equivalent check if the repository is not yet under version control) reports each path as ignored
- [x] 1.4 Create the findings document in the change directory with one section per success criterion and a recommendations section; verify all six criteria headings are present

## 2. Shared helpers

- [x] 2.1 Write the stable-rendering helper (fixed viewport and device scale, locale, timezone, disabled animations, hidden caret); verify by capturing a known page and asserting the image dimensions equal viewport times scale
- [x] 2.2 Write the annotation overlay helper (highlight, arrow, badge) that positions from bounding boxes and does not shift page layout; verify by comparing a page's element positions before and after adding annotations
- [x] 2.3 Write the element-capture wrapper with padding and a clip that is the union of the element and its annotations, clamped to the page; verify an arrow placed outside an element is present in the cropped image
- [x] 2.4 Write the determinism runner that executes a scenario twice in separate browser launches and reports differing pixels at zero and at a small tolerance; verify it reports zero differences for a static local page and a non-zero count for a page that deliberately changes between runs

## 3. Site spikes

- [x] 3.1 saucedemo.com: script login, save storage state, then in a separate headless run load it and capture an element crop with padding of a post-login page; verify the image shows the logged-in page with no manual editing
- [x] 3.2 saucedemo.com: delete the state file and rerun; verify the run fails with a message that names the missing state and does not write a screenshot of the login page
- [x] 3.3 play.grafana.org: capture a dashboard panel first unmasked, then with timestamps and live data masked or hidden; verify via the determinism runner that the unmasked pair differs and the masked pair is within the recorded threshold
- [x] 3.4 demo.playwright.dev/todomvc: script a multi-step walkthrough (add items, complete one, filter) with a highlight at each step, all in one session; verify each captured image shows the highlighted element
- [x] 3.5 demo.playwright.dev/todomvc: run a later step in a fresh context and one in the continued session; verify the fresh context does not see the earlier items and the continued session does
- [x] 3.6 Optional: reproduce the annotated Datasette menu screenshot from shot-scraper's announcement using the helpers instead of raw JavaScript; verify the result is judged comparable to the original and note how many lines of script it took

## 4. Findings

- [x] 4.1 Fill in each success criterion in the findings document with a yes or no verdict, evidence (image paths, diff counts), and notes; verify no criterion section is left empty
- [x] 4.2 Record environment details (operating system, Chromium version, fonts relevant to rendering) and the determinism threshold that was needed; verify the findings state whether byte-identical output was achieved
- [x] 4.3 Record recommended defaults (viewport, device scale, padding) and the annotation approach that held up, and list implications for the core pipeline, session-state, and annotations-and-stability changes; verify each of the three follow-on changes has at least one implication or an explicit "none"
- [x] 4.4 Review the findings against the roadmap and decide whether the next change (core build pipeline) is still correct; verify the decision and its reasoning are written at the end of the findings document

## Workflow follow-up

- Archive the change after the findings have been reviewed. Because the change sets `skip_specs`, archiving adds no spec content.
- Next change to consider: the core build pipeline, informed by the findings. The earlier plan in `doxer-screenshot-docs-builder` is the source material for it and for the session-state and annotations changes.
