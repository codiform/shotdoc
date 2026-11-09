# Spike findings

All six success criteria were met. The spike also found six problems that would have caused silent or confusing failures in a real tool; those are the most valuable results and are listed under "Things the spike found that we did not expect".

Evidence paths are under `spike/out/` unless stated. Scripts are under `spike/sites/`, `spike/lib/`, and `spike/tests/`.

## Environment

- Date run: 2026-11-08
- OS: macOS 15.7.9 (build 24G830), x86_64
- Node: v26.8.2; Playwright 1.65.x
- Browser: Playwright Chromium headless shell 158.0.8127.18 (chromium-headless-shell v1254)
- Fonts: sites using web fonts (Grafana, saucedemo) rendered identically across runs. The Datasette demo renders in a system font stack, so its pixels depend on the machine's fonts. Not tested on any other OS, machine, or in a container.

## 1. Element crops with padding need no manual editing

- **Verdict: yes**
- Evidence: `saucedemo-item.png` (post-login item card), `todomvc-3-completed.png`, `datasette-annotated.png`, `grafana-frozen.run1.png`. All four are usable as published without editing.
- Notes:
  - Padding pulls in neighbouring content: the saucedemo crop with 16px padding shows the top edge of the next card. Authors will need to choose padding per shot, or crop tighter.
  - A crop sometimes needs to span more than one element (Datasette: the header plus the whole open menu). A single-locator crop is not enough; the crop needs a way to include extra regions.

## 2. Locator-positioned highlight and arrow; arrow from outside the element is not cropped away

- **Verdict: yes**
- Evidence: `t2-2-annotated.png` (highlight, four arrow directions, badge), `t2-3-union.png`, `todomvc-3-completed.png`.
- Control experiment: a plain element screenshot of a button with a highlight and arrow around it contained **0** annotation pixels; the union-clip capture contained **6,672**. Even a highlight's outset falls outside the element's box, so a naive element crop would lose every annotation.
- Layout safety: adding a highlight, four arrows, and a badge changed no element position and no scroll size; clearing them restored the page exactly (`tests/t2-2-annotate.mjs`).
- Notes: annotations overlay page content (the Datasette arrow covers part of a table cell). That is expected, but authors should be able to choose the side.

## 3. Dynamic regions can be masked or frozen

- **Verdict: yes** (both approaches work; they suit different needs)
- Evidence (Grafana "Gradient mode" panel, two separate launches each, with a distinct-colour count to prove the images are not blank):

| Variant | Distinct colours | Differing pixels (exact) | Result |
|---|---|---|---|
| Unmasked, fixed time range | 2160 | 190,901 | Differs |
| Masked, fixed time range | 241 | 0 | Identical |
| Unmasked, relative range | 2141 | 191,767 | Differs |
| Masked, relative range | 241 | 0 | Identical |
| Frozen (record and replay query responses) | 2227 | 0 | Identical, real data visible |

- Notes:
  - **Masking** hides the content with a solid rectangle. It is simple, but the rectangle covers the panel's rounded corners, and the image no longer shows the feature being documented.
  - **Freezing** by recording the app's query responses on one run and replaying them on the next keeps the real content visible and is pixel-identical. This is the better option when the doc needs to show data. It needs network interception and a stable way to key requests (the request ID had to be stripped).
  - Pinning an absolute time range in the URL does **not** make this site's data deterministic.

## 4. Two consecutive runs produce visually identical images

- **Verdict: yes, on one machine**
- Threshold needed: **zero**. Every scenario was byte-identical, so no tolerance was needed.
- Byte-identical achieved: yes, for all of these (each run twice in separate browser launches, each with real content):
  - local static page (2560x1600)
  - saucedemo post-login crop (6,767 colours)
  - todomvc walkthrough step with highlight and arrow (466 colours)
  - Datasette annotated menu (1,964 colours)
  - Grafana masked and frozen variants
- Not tested: a different machine, operating system, or container; font differences on system-font sites; anything that depends on the current date or time.
- Caveat for the claim: this holds when settings are fixed (viewport, scale, locale, timezone, animations disabled, caret hidden) and dynamic regions are masked or frozen.

## 5. Login saved once and reused headlessly; missing state fails clearly

- **Verdict: yes**
- Evidence: `sites/saucedemo-login.mjs` saved a state; `sites/saucedemo-capture.mjs` loaded it headlessly and produced `saucedemo-item.png`.
- Failure cases, all exit code 1 and no image written:
  - state file missing: message names the state, the expected path, and how to create it
  - state present but logged out (simulated with empty cookies): refused, not screenshotted
  - **state naturally expired**: saucedemo's session cookie lasted about **9.7 minutes**. The state saved at 15:02 was rejected at 15:18, and the same check caught it without any simulation.
- Notes: the "is this still logged in?" check was site-specific (is the login button present). That supports making validity an author-supplied check, as the earlier design proposed.

## 6. Continue versus fresh sessions behave as expected on a multi-step walkthrough

- **Verdict: yes**
- Evidence: `sites/todomvc-walkthrough.mjs` (four steps in one session, each with its highlight visible) and `sites/todomvc-state.mjs`:

| Situation | Items seen |
|---|---|
| Continued session, navigate again | 2 |
| Same context, new page | 2 |
| Fresh context | 0 |
| New context loaded from saved storage state | 2 |

- Notes: saved state restored cookies and local storage but not the current URL or page, which matches the design (blocks begin with a navigation).

## Optional: Datasette annotated menu reproduction

- Result: reproduced with helpers (`datasette-annotated.png`); judged comparable in clarity to the original. The original 2022 demo URL now returns 404, so a current public Datasette demo was used.
- Script length: 18 lines of code, against roughly 45 lines of raw JavaScript in the original. The comparison is rough, because the original also trimmed the page.

## Things the spike found that we did not expect

1. **Identical can mean blank.** Early on, every Grafana variant came out byte-identical, which looked like a success. The panels were actually empty, so the comparison was meaningless. A determinism check must also confirm the image has content (the spike now counts distinct colours). The real tool needs an equivalent guard or a wait-for-content step.
2. **A full-page clip can break apps.** Capturing an element with a full-page screenshot resizes the viewport to the document size. Grafana scrolls an inner container and re-renders on resize, so its panels came back blank. The capture now uses a plain viewport clip when it fits, and falls back to full-page only when it must.
3. **A returned click does not mean the UI has updated.** On todomvc the URL changed to the Active filter while the list still showed three items; it showed two 500ms later. A screenshot taken right after an action can show the old state. The pipeline needs an explicit wait or settle strategy.
4. **Fractional layout changes output size.** An element 82.39px wide produced 228px or 229px images depending on capture mode. Snapping clips outward to whole CSS pixels makes the size predictable and mode-independent.
5. **Animation disabling only applies at capture.** Playwright's `animations: "disabled"` settles animations when the screenshot is taken; the live page keeps animating. Anything that reads layout mid-animation can see a moving target.
6. **Sites can break assumptions.** On the Datasette page, Playwright's complex CSS queries failed with "element.matches is not a function"; text and role locators worked. This supports keeping the JavaScript escape hatch and preferring role and text locators.
7. **Third-party demos drift.** The original Datasette demo page is gone (404). Any doc build against a live site will eventually break this way, and the error message needs to say which step and locator failed.

## Recommendations

### Defaults
- Viewport 1280x800, increased to about 1100 high for tall panels (an inner-scroll app needs the target in view). Device scale 2.
- Padding: 16px is a sensible default (range tried: 8 to 40).
- Locale `en-US`, timezone `UTC`, animations disabled, caret hidden.
- Mask colour: a neutral mid-grey worked.

### Annotation approach
- **DOM overlay held up; image post-processing was not needed.** Annotations are positioned from each target's bounding box at capture time in a container that does not affect layout, and the capture clip is the union of the element, its annotations, and any extra regions, plus padding, snapped to whole pixels.
- The option names that worked and read well: `highlight(locator, {outset, width, color})`, `arrow(locator, {from, gap})`, `badge(locator, number)`.

### Implications for follow-on changes
- **Core build pipeline:**
  - Default to a viewport clip with a full-page fallback, and snap clips to whole pixels.
  - A wait or settle step is needed in the step set; a click returning is not enough.
  - A crop needs a way to include extra regions beyond one locator.
  - Guard against blank captures.
  - Error messages should name the file, line, step, and locator.
  - Prefer role and text locators in examples.
- **Session state and auth:**
  - Saved state restores cookies and local storage, not the page or URL, so the block must begin with a navigation (confirmed).
  - Validity must be an author-supplied check; a real session expired in about 10 minutes, so expiry is an everyday case and not an edge case.
  - The first-block and document-default-state ideas from the earlier plan still stand.
- **Annotations and stability:**
  - The overlay design and the three annotation types are proven.
  - Freezing by recording and replaying network responses is worth specifying as a first-class option alongside masking, because masking hides the very content a doc may want to show.
  - Exact comparison (threshold zero) is realistic on a fixed machine; cross-machine stability is untested and should be treated as an open risk, possibly needing a container.

## Decision on the next change

The next change should still be the **core build pipeline**. All six criteria were met, so the tool is viable as designed, and nothing here argues for a different first step.

The findings do change what that change must cover, beyond the earlier plan: a settle or wait step, viewport-first clipping with whole-pixel snapping, multi-region crops, and a blank-capture guard. These should be written into its proposal and specs from the start and not discovered later.

One suggestion on ordering after that: consider doing **annotations and stability before session state**. The annotation approach is now proven, and a simple walkthrough with highlights (the stated simple case) needs annotations far more than it needs saved logins. Session state can follow. This is a recommendation for you to decide on, not something the spike settled.
