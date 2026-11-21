# Proposal

## Why

The built document keeps the source's front matter, including the `shotdoc` key. GitHub (and some other renderers) shows front matter as a table, so the first thing a reader of the built TodoMVC example sees is a nested table of build settings (`shotdoc` / `defaults` / `hide` / `text`). Those settings are instructions to shotdoc and mean nothing in the built output. This reverses the open question left in `add-document-defaults`, and a switch was considered and rejected: nobody publishing built docs wants them.

## What Changes

- The built document no longer contains the `shotdoc` key of the front matter.
- Every other front-matter key (a `title` or `layout` for a site generator) stays exactly as written, formatting and comments included.
- If `shotdoc` was the only key, the whole front-matter block and the blank line after it are removed, so the built file starts with its first real content.
- A source with no `shotdoc` key, or no front matter, is built as before.
- The README says so, and the TodoMVC example's built output loses its front matter.

The source file is untouched: it still shows the table on GitHub, which is acceptable for the file an author edits.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `doc-build`: "Front matter is carried through unchanged" is renamed and changed to remove the `shotdoc` key, and "Blocks are replaced by their screenshots" states its one exception to "all other content exactly as written".

## Impact

- `src/parse/frontmatter.ts` and `src/emit.ts`: a function that removes the key from the built text, and its use when the document is built.
- `README.md`, `examples/todomvc/output/todo-mvc.md`, tests. No new dependency (the `yaml` package is already used).
- Built output of documents with front matter changes; documents without it are built exactly as before.
