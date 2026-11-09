# Proposal

> **Renamed:** the tool is now called **shotdoc**. This change was written under the working name
> `doxer`, so its text (fence tag `doxer`, `doxer.config.yaml`, `.doxer/states/`, the `doxer login` command)
> uses the old name. Read those as `shotdoc` when harvesting. The directory name is left as is.

> **SUPERSEDED - source material and roadmap record only. Do not apply this change.**
>
> This change bundled the whole tool into one increment, so it was split into smaller changes.
> Keep it until its last piece has been harvested, then **delete the directory by hand. Do not
> archive it**: archiving would merge these unbuilt requirements into the main specs as if the
> system already did them.
>
> **Treat its text as a starting point, not truth.** The spike
> (`openspec/changes/archive/2026-11-08-spike-screenshot-quality/findings.md`) overrides it
> where they conflict. Known stale points: element crops no longer use a full-page clip (use a
> viewport clip with full-page fallback, snapped to whole pixels); a settle/wait step is
> needed; a crop may need extra regions to include; a blank-capture guard is needed.
>
> ### Planned sequence
>
> | # | Change | Status | Takes from this change |
> |---|---|---|---|
> | 1 | `spike-screenshot-quality` | archived 2026-11-08 | old task group 2; findings in the archive |
> | 2 | `core-build-pipeline` | next | setup; `doc-build`; `block-language` (YAML steps only, no `js`, no state attributes); simple session (continue by default, first block starts clean); basic capture (viewport/element crop, padding, stable rendering) |
> | 3 | `annotations-and-stability` | planned | annotation parts of `screenshot-capture` (highlight, arrow, badge, hide, mask); freeze by replaying responses; blank-capture guard and determinism checks |
> | 4 | `js-blocks` | planned | `js` escape hatch from `block-language`; the `js` runtime task |
> | 5 | `session-state-and-auth` | planned | rest of `session-state`: named states, `save=`, interactive login, validity checks, saved states as secrets; front-matter default state |
> | later | HTML templating (Pandoc candidate), CI login, rebuild caching | unscheduled | none |
>
> Order after #2 was a recommendation from the spike (annotations before session state), not a
> settled decision. Capabilities started in an earlier change (`session-state`,
> `screenshot-capture`, `block-language`) are extended by later changes, not recreated.
>
> **Pending edits that belong to #5, never applied here:** the first block starts in a new empty
> context (the simple part of this moves into #2), and a front-matter `doxer: {state: ...}`
> default for the first block, with the `doxer:` key removed from built output.

## Why

Documentation for web applications is image-heavy, and screenshots go stale whenever the UI changes. Re-capturing them by hand is tedious, so docs drift. Existing tools split the problem: browser-automation tools (Playwright, Cypress) capture screenshots but have no concept of prose, and screenshot CLIs (e.g. shot-scraper) capture single images but cannot carry a browser session across a walkthrough. Nothing lets an author write the documentation first and have the screenshots produced by instructions embedded in it.

## What Changes

- Introduce **doxer**, a Node/TypeScript tool built on Playwright. It reads Markdown whose fenced blocks describe browser actions, runs them in order, and writes a built Markdown document with each block replaced by the screenshots it produced.
- Blocks use a **hybrid language**: declarative YAML steps for common actions (goto, click, screenshot, highlight, arrow, hide/mask) plus a `js` block that exposes the Playwright `page` as an escape hatch.
- **Fence-header attributes** control session state for both block types: continue the previous session (default), start fresh, load a named saved state, or save state after the block.
- **Graceful degradation**: the source Markdown stays valid and readable (unbuilt blocks render as code on GitHub). The build writes to a separate output and never overwrites the source.
- **Screenshot ergonomics** are first-class: element crops with padding, locator-positioned highlight, arrow and numbered-badge annotations injected as DOM overlays, masking or hiding of dynamic content, fixed viewport and device scale, disabled animations, and stable filenames.
- **Authentication** via named Playwright storage state: an interactive headed login command saves a state, and builds reuse it headlessly. A missing or expired state fails with a clear error instead of capturing a login page. Programmatic login (env-var credentials) for CI is a follow-on.
- **Spike first**: before the syntax is frozen, validate screenshot quality and determinism against three public sites (saucedemo.com, play.grafana.org, demo.playwright.dev/todomvc).
- **Out of scope for now**: HTML rendering from an externalized template (Pandoc `--template` is the likely approach), programmatic CI login, rebuild caching, and arrow styles beyond simple built-ins.

## Capabilities

### New Capabilities
- `doc-build`: Parsing source Markdown, executing blocks in document order, and emitting built Markdown plus images to a separate output without altering the source.
- `block-language`: The block syntax: YAML step blocks, `js` escape-hatch blocks, and the fence-header attribute grammar.
- `session-state`: Browser session continuity across blocks, fresh contexts, named saved states, and authentication via an interactive login command with clear failure on missing or expired state.
- `screenshot-capture`: Producing documentation-quality images: crops, locator-based annotations, masking, stable rendering and filenames, and deterministic output across runs.

### Modified Capabilities
<!-- None: greenfield project, no existing specs. -->

## Impact

- New Node/TypeScript package; no existing code is affected (the repository currently contains only OpenSpec scaffolding).
- New dependencies: Playwright (and its browser binaries), a Markdown parser, a YAML parser.
- New CLI surface: a build command and an interactive login command.
- Network and credential considerations: builds drive real sites, and saved storage-state files contain session cookies and must not be committed.
- Open questions deliberately left for design: exact block syntax details, rebuild/caching model, and how HTML templating plugs in.
