# Live example build

Built on 2026-11-11 from the project root, with no flag, against the live demo:

    node dist/cli.js build examples/todomvc/input/todo-mvc.md

Output:

    Using examples/todomvc/shotdoc.config.yaml
    Built examples/todomvc/output/todo-mvc.md (9 images)

What this confirmed:

- The config was found above the source (`examples/todomvc/input/` has none), so no `--config` was needed, and `outDir: output` resolved beside it, writing to `examples/todomvc/output/`.
- The first block's `goto: /` (the context root of `https://demo.playwright.dev/todomvc/`) loaded the app.
- The built Markdown is unchanged, and eight of the nine images are byte-identical to the previous build. Only `completed.png` differs: the delete button no longer shows on the ticked row, because the `unhover` step before its screenshot moves the pointer away.

Gaps: none found. The README's rebuild command is the command above.
