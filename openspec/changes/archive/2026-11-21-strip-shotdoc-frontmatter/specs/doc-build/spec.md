# Spec Delta

## RENAMED Requirements

- FROM: `### Requirement: Front matter is carried through unchanged`
- TO: `### Requirement: Build settings are removed from the front matter`

## MODIFIED Requirements

### Requirement: Build settings are removed from the front matter
The built document SHALL NOT contain the `shotdoc` key of the source's front matter. Every other front-matter key SHALL appear exactly as written. When `shotdoc` is the only key, the front matter and the blank line after it SHALL be removed. A source with no `shotdoc` key or no front matter SHALL be built as before.

#### Scenario: Front matter in the output
- **WHEN** a source starts with front matter holding `title` and `shotdoc` keys
- **THEN** the built document starts with front matter holding the `title` line exactly as written and no `shotdoc` key, followed by the built content

#### Scenario: Only the shotdoc key
- **WHEN** a source starts with front matter holding only a `shotdoc` key
- **THEN** the built document starts with the content that followed the front matter and contains no front matter

#### Scenario: Other keys are kept exactly
- **WHEN** the front matter holds `title: 'Guide'   # for the site`, a `tags: [a,   b]` list and a `shotdoc` key
- **THEN** the built document's front matter holds the `title` and `tags` lines byte for byte and has no `shotdoc` key

#### Scenario: Key position and layout
- **WHEN** the `shotdoc` key is first, in the middle or last, written as a block or on one line with a trailing comment
- **THEN** in each case only that key is removed and the other lines are unchanged

#### Scenario: No shotdoc key
- **WHEN** the front matter has no `shotdoc` key
- **THEN** the built document starts with the same front matter, byte for byte

#### Scenario: Front matter only affects screenshots
- **WHEN** the front matter defines defaults and the document has two shotdoc blocks
- **THEN** both blocks are replaced by their screenshots and no other text changes

### Requirement: Blocks are replaced by their screenshots
In the built document, each shotdoc block SHALL be replaced by Markdown image references, one per screenshot the block produced, in the order taken. A block that produced no screenshots SHALL be removed. All other content SHALL appear in the built document exactly as written, except the `shotdoc` key of the front matter.

#### Scenario: Block with two screenshots
- **WHEN** a block takes screenshots named `home` and `login`
- **THEN** the built document contains an image reference for `home` followed by one for `login` where the block was

#### Scenario: Block with no screenshots
- **WHEN** a block navigates and clicks but takes no screenshot
- **THEN** the block does not appear in the built document and the surrounding text is unchanged

#### Scenario: Non-shotdoc fenced blocks are untouched
- **WHEN** the source contains a fenced code block whose info string is not `shotdoc`
- **THEN** the built document contains that block exactly as written
