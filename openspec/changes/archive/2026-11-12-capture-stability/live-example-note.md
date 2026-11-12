# Live example build

Built on 2026-11-11 from the project root, against the live demo, with the blank-capture guard in place:

    node dist/cli.js build examples/todomvc/input/todo-mvc.md

Output:

    Using examples/todomvc/shotdoc.config.yaml
    Built examples/todomvc/output/todo-mvc.md (9 images)

What this confirmed:

- None of the nine screenshots was rejected as blank.
- `git status` shows no change under `examples/todomvc/output`: every image and the built Markdown are byte-identical to the previous build. That is also a live check of repeatability, against a real third-party page.

Gaps: none found.
