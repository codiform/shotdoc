# Design

## Context

See proposal.md for motivation. Today a screenshot step carries its own `hide`, `mask`, `maskColor` and `annotate`, and `applyEffects` in `src/run/capture.ts` turns them into page changes: hide sets `visibility: hidden`, mask is passed to Playwright, and both first wait for a match with `requireMatch` (`waitFor` attached, so a missing target waits out the timeout and fails). `parseDocument` finds blocks with markdown-it over the whole source and keeps line numbers from that, and `buildDocument` copies everything outside the blocks byte for byte. The only per-project file is `shotdoc.config.yaml`; there is no per-document metadata yet.

## Goals / Non-Goals

**Goals:**
- Declare `hide`/`mask`/`maskColor` once per document and have them apply to every screenshot in it.
- Defaults never make a screenshot fail or slow down just because the thing they target is not on this page or not in this region.
- Shape the code so a shot's effects come from ordered layers, so project-level defaults and "from here on" steps can be added later without changing per-shot syntax.

**Non-Goals:**
- Defaults in `shotdoc.config.yaml`, standing steps with a clear step, or a "defaults from here on" step. These are tracked as #21, #22 and #23.
- Defaults for `annotate`.
- Stripping or rewriting front matter in the built document.

## Decisions

**Defaults live in the document's front matter under `shotdoc.defaults`.** Front matter is per document and leaves the block language alone. The `shotdoc:` namespace keeps other tools' keys (a static-site generator's `title`, `layout`) out of our validation, and leaves room for other document-level settings. Alternatives: `shotdoc.config.yaml` is project-wide, which suits sharing defaults across documents but not one document's demo bar; a `defaults` step in a block gives "from here on" but is subtler to explain and would be built on top of this anyway. Both remain possible as further layers.

**Front matter is read by a small function, not a plugin.** It checks that the file starts with a `---` line, finds the closing `---` or `...`, and parses the text between with the `yaml` package already in use. The source passed to markdown-it is left whole, so block line numbers stay correct and `buildDocument` is untouched. markdown-it would treat a leading `---` block as a thematic break and a heading, which is harmless to block detection. A front-matter plugin would add a dependency for about twenty lines of work. A leading BOM and CRLF line endings are handled. Errors name the file and the key path (`shotdoc.defaults.hide[2]`); they carry no block line because front matter has no block.

**Resolved at parse time and carried on each screenshot step.** The parser gives every screenshot a `defaults` field holding the document's hide targets, mask targets and mask colour, empty when the shot has `defaults: false` or the document has none. The runner then needs nothing but the step. Alternative: pass defaults through the run context. That changes `parseDocument`'s result and the runner's signature for every test, and the step is already the unit that carries everything a capture needs.

**A shot's effects are layers, computed in one place.** The hide list for a capture is the defaults layer followed by the shot's own, and likewise for mask; the mask colour is the shot's own, else the layer's, else the built-in grey. Today there is one layer. A config layer, then the document layer, then standing effects, then the shot's own would extend the same function, which is the point. Duplicates (the same element in two layers) look the same in the image: hiding or masking twice is idempotent. Restoring is not, since the element's visibility is saved once per match, so `restore` puts the saved values back in reverse order and the original, saved first, is the one that survives.

**Default targets are applied leniently; the shot's own stay strict.** Default targets skip `requireMatch`. Hiding already uses `evaluateAll`, which does nothing for zero matches and does not wait. Masks go to Playwright's `mask` option, which takes locators; the fixture tests confirm that Playwright ignores mask locators that match nothing, that match something outside the clip, and that match an element that is not displayed, so no `count()` filter is needed. A default target is therefore applied to whatever is present at the moment of capture: a default for an element that appears late will miss it. A screenshot that needs to wait for such an element says so with its own list or a `wait` step. Alternative: wait briefly for defaults. Rejected because every screenshot of a page without the element would pay the wait.

**Opt out with `defaults: false` on the screenshot.** Defaults add to a shot's own lists, so an empty `hide: []` could not remove them. A boolean on the step is the smallest syntax that can, and it covers the real case (a shot that wants to show the demo bar). Selectively dropping one default is not supported; use two shots or leave that target out of the defaults.

**`annotate` is refused in defaults, with a message that says why.** A default annotation would hit the exactly-one-match rule on every page that lacks the element and would renumber badges in every shot. Neither has a clear answer and neither is needed for the repetition that prompted #18.

**Front matter is copied to the built output unchanged.** It is "other content", so the existing byte-for-byte rule already covers it and no emitter code changes. The cost is that `shotdoc:` configuration appears in the built Markdown. See Open Questions.

## Risks / Trade-offs

[A default that silently matches nothing hides a typo, so the demo bar quietly stays in every image] → Strictness for the shot's own targets is unchanged, and the built image is what authors review. A later `--strict-defaults` or a build summary of defaults that never matched anywhere is possible and not needed now.

[A document with front matter that is not for shotdoc breaks validation] → Only the `shotdoc` key is read; any other key is ignored. A malformed front matter block does fail, since it cannot be read reliably.

[Playwright's mask behaves differently for targets that are absent, hidden or clipped] → Covered by fixture tests in the capture task, with a `count()` filter as the fallback.

[A `---` at the start of a file that is really a thematic break is read as front matter] → Only a closed block that parses as YAML is front matter; an unclosed one means no front matter, and a closed one that is not YAML is an error that names the problem. Documents that start with a rule are rare.

## Open Questions

- Should the built document drop the `shotdoc` key (or the whole block if it holds only that)? Keeping everything is simplest and honest; stripping is tidier for published output. Either can be changed later without touching the capture code.
