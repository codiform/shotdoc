# Spike: screenshot quality

**This is throwaway code.** It exists to answer the six success criteria in
`openspec/changes/spike-screenshot-quality/proposal.md`. It is not the start of
the doxer implementation, nothing outside this directory should import from it,
and it may be deleted once the findings are written.

- Scripts: one per site, plus `lib/` for helpers that several scripts share.
- Output images: `out/` (ignored by version control).
- Saved login state: `.state/` (ignored by version control; contains session cookies).
- Findings: `openspec/changes/spike-screenshot-quality/findings.md`.
