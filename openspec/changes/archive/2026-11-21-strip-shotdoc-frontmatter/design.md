# Design

## Context

See proposal.md for motivation. `buildDocument` in `src/emit.ts` copies everything outside the blocks byte for byte and replaces each block's line range with image references; `build.ts` writes the result. Front matter is found by `readFrontMatter` in `src/parse/frontmatter.ts` with a regular expression over the start of the source. The previous change (`add-document-defaults`) kept the front matter in the output and listed stripping it as an open question.

## Goals / Non-Goals

**Goals:**
- Built output never carries the `shotdoc` key.
- Other front-matter keys survive byte for byte, so a site generator's metadata is not reformatted.

**Non-Goals:**
- A switch to keep the key. Rejected: no reader benefits from build settings, and a switch is one more thing to document and test.
- Changing how the source is read, or removing any other front-matter key.

## Decisions

**Strip from the built text, after the blocks are replaced.** The front matter is at the very start and the blocks come after it, so removing it from the finished text cannot disturb the line ranges `buildDocument` uses, and the emitter's block logic stays as it is. Alternative: remove it from the source first and shift every block's line range. Rejected as needless bookkeeping.

**Cut the key out by its source range, never re-serialize.** The `yaml` package gives each key and value a character range. The key's span, from the start of `shotdoc` to the end of its value, plus the rest of that line (a trailing comment and the line ending), is removed and everything else is left alone. Alternative: delete the key from the parsed document and print it back. Checked while planning: that reformats the other keys (`[a,   b]` becomes `[ a, b ]`, spacing is collapsed, some comments are dropped), which breaks "exactly as written". Alternative: remove lines by indentation. Rejected: it breaks on a flow mapping that spans lines.

**"Only key" means the parsed mapping has one entry.** Then the block (opening to closing line) and one blank line after it are removed, so the file starts with its first real content. A front matter holding only `shotdoc` and some comments loses the comments with it, which is acceptable since they are about the settings.

**Parsing is already validated.** A front matter with a problem fails validation before anything is built, so the stripper only sees front matter that parsed. A block that is closed but not a mapping, or has no `shotdoc` key, is returned unchanged. CRLF line endings and a BOM are handled as the reader does.

## Risks / Trade-offs

[A comment written above the `shotdoc` key, about it, is left behind] → It is rare, harmless, and removing it would mean guessing which comments belong to the key.

[Built output no longer matches the source outside the blocks, which the "exactly as written" rule promised] → The exception is stated in the spec, and is limited to one key.

[Range handling is fiddly (a block value's range includes its final newline, a flow value's does not)] → The unit tests cover both forms, trailing comments, and first, middle and last positions, and a test compares the other keys byte for byte.

[The source still renders as a table on GitHub] → Accepted: it is the file the author edits, and GitHub renders front matter whatever it contains.
