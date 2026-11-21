# Spec Delta

## ADDED Requirements

### Requirement: Front matter is carried through unchanged
The built document SHALL contain the source's front matter exactly as written, including the `shotdoc` key, like all other content outside the blocks. A document that has front matter and no shotdoc blocks SHALL be built as before.

#### Scenario: Front matter in the output
- **WHEN** a source starts with front matter holding `title` and `shotdoc` keys
- **THEN** the built document starts with the same front matter, byte for byte, followed by the built content

#### Scenario: Front matter only affects screenshots
- **WHEN** the front matter defines defaults and the document has two shotdoc blocks
- **THEN** both blocks are replaced by their screenshots and no other text changes
