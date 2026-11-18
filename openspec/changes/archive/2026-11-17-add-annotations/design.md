# Design

## Context

See proposal.md for motivation. Capture lives in `src/run/capture.ts`. `takeScreenshot` waits for the target and its `include` targets to be visible and still, calls `applyEffects` (hide and mask, returning an `Effects` with a `restore`), then `capture`, which measures the target and included elements with `measure()`, builds the region with `region()` (union, padding, clamp to the page, snap to whole pixels) and takes the screenshot by one of three paths (viewport, a clip within the viewport, a larger region with `fullPage`). Screenshot keys are validated in `parseScreenshot` in `src/parse/steps.ts`, and `parseTarget` already understands the four target forms.

What the spike recorded (archived `spike-screenshot-quality`, `spike/lib/annotate.js`): highlight, arrow and badge as DOM in an overlay container (`position: absolute`, size 0, `overflow: visible`, `pointer-events: none`, top z-index) appended to `documentElement`, positioned from `getBoundingClientRect()` plus scroll at capture time. The layout was unchanged, annotated runs on one machine were byte-identical, and a control showed 0 annotation pixels with a plain element crop against 6,672 with the union clip. That last result is why the region must include the annotations.

## Goals / Non-Goals

**Goals:**
- Point at things within one screenshot with a box, an arrow and numbered badges, readable on light and dark pages.
- Never crop an annotation away, and never change the page's layout.
- The effect lasts for one capture; later screenshots see the page as it was.

**Non-Goals:**
- Labels, spotlight, magnifier, other shapes, persistence across screenshots and document defaults; see the proposal and #18.

## Decisions

### An `annotate` list of single-key items
```yaml
- screenshot:
    name: toolbar
    target: ".toolbar"
    annotate:
      - highlight: {role: button, name: Save}
      - arrow: {target: "#export", from: right}
      - badge: {target: {text: Delete}, color: "#0a0"}
```
Each item has one key naming the kind, as steps do, and its value is a target or a mapping with `target` and options. A target mapping never has a `target` key (`role`, `text` and `label` are its only primary keys), so a mapping with `target` is unambiguously the options form and nothing else needs a marker. `from` belongs to `arrow` only and is rejected on the others, so a typo does not pass quietly. Annotations require a screenshot `target`, as `include` does.

*Alternatives considered:* one mapping with `kind:` and `target:` (rejected: more to type and unlike every other list in the language); separate `highlight`, `arrow` and `badge` keys on the screenshot (rejected: three lists lose the listed order, which numbers the badges, and each grows its own option handling).

### Per screenshot, applied after hide and removed in `restore`
Annotations are an option on one screenshot, like `hide` and `mask`, so there is no clearing step and nothing leaks into later shots. The overlay is added in `applyEffects`, after hide and before the capture, and removed in the `Effects.restore` that already runs in a `finally`. Scoping beyond one screenshot (a default, or a standing step with a clear) is #18. The constraint it puts on this change is only that the effects for a capture come from one resolved list, so a default or standing list could be put in front of the screenshot's own later without changing the per-screenshot syntax. Annotations are one more entry in that list, not a special case.

### Overlay in a shadow root, built without inline styles
The spike's overlay sat in the page's light DOM, where a stylesheet such as `* { border: 1px solid red; box-sizing: content-box }` or `div { margin: 8px }` would change how the annotations draw. Here the overlay is one host element, a custom element (`shotdoc-overlay`) so that page rules for `div` do not reach the host itself, with an attached shadow root and `all: initial`, so page selectors do not reach the annotations (inherited properties are reset by `all: initial` on the host). A first version used a `div` host and a page rule `div { transform: rotate(7deg) !important }` moved the whole overlay; the fixture with hostile styles found it. The shadow root is not in the spike's findings; a fixture with aggressive global CSS decides it (tasks 2.2). If it does not hold, the fallback is `all: initial` on each annotation element.

Elements are created with DOM calls and styled through CSSOM (`el.style.cssText`, `setAttribute` only for SVG geometry), with no `<style>` element, `style` attribute string or `innerHTML`. A page with a strict Content-Security-Policy `style-src` blocks those, and CSSOM styling is not blocked. A fixture with such a policy checks it (tasks 2.3).

The host is `position: absolute`, zero size, `overflow: visible`, `pointer-events: none`, with the maximum `z-index`, and is appended to `documentElement`.

### Look: one colour, a white outline
The default colour is `#ff31a0` (the spike's), and every annotation carries a white outline, so it shows against dark and light backgrounds alike; a plain colour can vanish on a page of a similar colour, which a mid-grey (the mask's colour) would do often. `color` overrides the fill, and the outline stays white.

| Kind | Drawn as | Bounds in the capture |
| --- | --- | --- |
| `highlight` | box outset 5px from the element, 3px coloured border, a 2px white ring outside it and a 2px white ring inside that stops at the element's edge, 4px radius | element outset by 7px |
| `arrow` | 80x40 (or 40x80) SVG arrow, coloured fill and white stroke, 6px gap from the element's edge, centred on it along that edge | the SVG box |
| `badge` | 28px circle centred on the element's top-left corner, coloured fill, white 2px border, bold white digit in `sans-serif` | the circle |

The digits use a system font, so a badge's pixels depend on the machine's fonts. That is the same cross-machine caveat the project already states for other text, and the first place shotdoc draws text itself.

### The capture region includes the annotations
Drawing returns each annotation's bounds in document coordinates (element rect plus scroll at drawing time, plus any outset). `capture` adds them to the rectangles it already measures from the target and `include`, so `region()` takes the union of all of them, then pads, clamps and snaps as before. Nothing in `region()` changes. Padding is applied to the union, so an arrow at the edge of the region still has padding around it.

The page size used to clamp must be measured before the overlay is added. An annotation that overhangs the right or bottom edge extends the page's scrollable area, and clamping to that would keep blank space beyond the page instead of cutting off at the edge as the spec says. `applyEffects` measures the page size first and the capture uses it. Overhang at the top or left does not extend the scrollable area and is clamped as it is today.

*Alternative considered:* adding per-side padding or an inset to the screenshot (what #1 floated). Rejected: the union region includes whatever the annotations draw outside the target, and `include` covers elements outside it, so no case left for it.

### Targets: exactly one, waited for
An annotation target is resolved like the screenshot's target: wait until it is visible and still, using the same `waitUntilReady`. A miss or several matches fails the step as `<kind> target <description>: <reason>`, with `explain()`'s existing wording for the strict-mode case ("matched 3 elements but must match exactly one"), which is right here (hide and mask targets are the ones that may match several). Annotation targets are waited for before any page change, so a failure leaves nothing to undo.

### Numbering is a pure function
The badge number is its position among the badges in the list. A small function in `src/run/annotate.ts` turns the parsed list into the items to draw (kind, target, colour, side, number) and is tested without a browser. Explicit numbers can later become an optional override, and standing annotations (#18) can number continuing from the active list.

### Colour is validated in the browser
`color` is any non-empty string in the parser; the browser checks it with `CSS.supports('color', value)` before drawing, as for `maskColor`, and a value it does not accept fails the step naming the annotation and the colour. An unaccepted colour would otherwise draw nothing, which is a silently missing annotation.

### Masks sit above annotations
Playwright's `mask` paints over the whole page area in the image, overlay included, so a mask over an annotated element hides the annotation too. That is the right result for a mask, and the spec says so.

### Later: annotation groups (not built here)
An author may want to box three buttons together and badge them 1, then box two more and badge them 2. Nothing in this syntax prevents it, and it is not built now (tracked in a separate issue). The intended direction:
- `target` also accepts a list. A list is not a valid target today, so it cannot be confused with an existing form. A group's box is drawn around the union of its elements' rectangles, a badge goes on the union's top-left corner and an arrow points at the union's edge. Each listed element must still match exactly one.
- A combined box and badge is either two items sharing a target list (YAML anchors already make that cheap) or a `badge` option on `highlight` that numbers the box. Numbering stays the position among the items that show a number.
- What will make this a small change: drawing from a rectangle rather than an element, and an annotation carrying a list of targets that is one long today. Those are implementation choices for when groups are built; nothing here needs to change for them.

## Risks / Trade-offs

- **Fixed and sticky targets**: bounds are measured once, in document coordinates, when the overlay is drawn. A target that moves when the page scrolls (a sticky header) can be left behind by the scroll that fitting the region needs. The target is scrolled into view before the overlay is drawn to keep this rare; it is not handled otherwise, and the README says so.
- **Annotations at the page edge are cut off**: an arrow from the left of an element at the page's left edge is partly outside the page. The author picks another side with `from`.
- **Badge digits depend on the machine's fonts**: see above.
- **Iframes**: locators do not cross frames, as for every other target; annotating an element inside an iframe is not supported.
- **Shadow DOM isolation is unproven here**: gated on the global-CSS fixture, with a stated fallback.
- **Overlap**: two annotations on the same element draw on top of each other; the author spaces them with different sides or kinds.

## Open Questions

- Whether the TodoMVC example should use an arrow as well as a highlight. This change uses one highlight and keeps the prose unchanged; more can follow once the look is seen.
