# Tasks

## 1. Stripping the key

- [x] 1.1 Add `stripShotdocKey(text: string): string` to `src/parse/frontmatter.ts`: find the front matter as `readFrontMatter` does (BOM, CRLF, `---` or `...` close), parse it with the `yaml` document API, and remove the `shotdoc` key by its source range plus the rest of its line, leaving every other character alone; when `shotdoc` is the only key, remove the whole block and one following blank line; return the text unchanged when there is no front matter, no `shotdoc` key, or the front matter is not a mapping; verify unit tests for only-key (whole block and blank line gone), other keys byte-identical with odd spacing, quoting, comments and a flow list, `shotdoc` first, middle and last, block and one-line flow forms with a trailing comment, no `shotdoc` key, no front matter, a non-mapping, CRLF, a BOM, and a closing `...`

## 2. Building

- [x] 2.1 In `buildDocument` (`src/emit.ts`), pass the finished text through `stripShotdocKey`; verify emit tests that a document with front matter holding `title` and `shotdoc` is built with `title` kept and the key gone, that one with only `shotdoc` starts with its first content, that a document without front matter is built byte for byte as before, and that block replacement is unaffected (a document with two blocks)
- [x] 2.2 Update the build test that expects the front matter kept: verify the built file has no `shotdoc` key, keeps the other keys, and the images still have the defaults applied

## 3. Docs, example and checks

- [x] 3.1 In the README's defaults section, replace "The front matter stays in the built document exactly as written" with what happens now (the `shotdoc` key is removed from the built file, other keys stay, and a front matter that held only `shotdoc` disappears), and mention that the source still shows it; verify the README test still passes and add a check that the README says the built file drops it
- [x] 3.2 Rebuild the examples with `npm run build:examples`; verify `examples/todomvc/output/todo-mvc.md` now starts with `# TODO MVC`, that no image changed (`git status` shows only that Markdown file changed), and the Datasette example is untouched
- [x] 3.3 Run `npm run format`, `npm run lint`, `npm run typecheck`, `npm test`, and `openspec validate strip-shotdoc-frontmatter --strict`; verify they all pass, and walk each scenario in the spec delta to confirm it has a test, listing any gap

## Workflow follow-up

- Archive the change after review. Archiving renames "Front matter is carried through unchanged" to "Build settings are removed from the front matter" in `doc-build` with new text, and replaces "Blocks are replaced by their screenshots" (keeping its existing scenarios).
- No GitHub issue to close: this follows up the open question in `add-document-defaults` (#18, already closed).
