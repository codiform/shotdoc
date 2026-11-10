# Live example note (task 5.3)

Built by hand on 2026-11-08 against https://demo.playwright.dev/todomvc/:

```sh
cd examples/todomvc && node ../../dist/cli.js build input/todo-mvc.md
```

## Result

Exit 0 in about 3 seconds, 10 images, nine blocks. `output/todo-mvc.md` and `output/images/todo-mvc/` were replaced. With the images and `shotdoc` blocks removed, the prose of the built Markdown is identical to the input's.

Each image was looked at, not only counted:

| Image | State shown |
| --- | --- |
| `empty`, `input` | The two screenshots that were already in the example |
| `added` | One task after `press: Enter` |
| `three-tasks` | Three tasks, "3 items left" |
| `completed` | "Water the plants" ticked and crossed out, "2 items left" |
| `delete-button` | The delete control on the third row |
| `editing` | The third row as an edit field |
| `edited` | The renamed task, "Call the dentist at 3pm" |
| `active` | Filtered to Active, the completed task gone |
| `cleared` | Back on All with the completed task cleared |

## Findings

- **A click leaves the pointer over the element.** `completed.png` shows the delete button on the ticked row although no `hover` step ran there, because the checkbox click left the pointer on that row. This is the specified pointer behavior. The README now says that `click` and `dblclick` leave the pointer in place too, not only `hover`.
- **No way to move the pointer away** except hovering or clicking something else. A `completed` image without the stray delete button would need a neutral hover target first. The example accepts the button; it is natural-looking and does not mislead. If authors want clean states often, a dedicated "move pointer away" step could be a later addition.
- **The "todos" heading and the demo banner are in `target: body`.** As found before, the heading is outside the layout box of `.todoapp`, so the example frames `body` throughout.
- **`wait` is used in four places** (the item counter after ticking, the completed task vanishing after filtering, reappearing after returning to All, vanishing after clearing). Whether each is strictly required was not tested by building without them; they follow the spike's finding that a click can return before the list re-renders.
- **No gaps found in the step set** for this walkthrough.

# Scenario coverage walk (task 5.4)

Every scenario added or changed in `specs/block-language/spec.md` has an automated test; no manual-only checks were needed.

| Scenario | Test |
| --- | --- |
| Valid block; Malformed YAML; Role target; Target matches several elements; Invalid target shape | existing tests, still passing |
| Newly supported steps | `test/parse/steps.test.ts` (hover, dblclick, press in one block) |
| Unsupported step name (now `swipe`) | `test/parse/steps.test.ts`, `test/parse/document.test.ts`, `test/cli.test.ts` |
| Scoping one of several identical elements | `test/run/selectors.test.ts` |
| Double-click opens edit mode | `test/run/pointer.test.ts` |
| Hover reveals a control | `test/run/pointer.test.ts` (exact red-pixel count of the control, with and without hover) |
| Hover persists across steps | `test/run/pointer.test.ts` (screenshot in a later block) |
| Missing element (hover, dblclick) | `test/run/pointer.test.ts` (10 s timeout, target named) |
| Submit after fill; Press on a target; Key with modifier | `test/run/press.test.ts` |
| Malformed press step | `test/parse/steps.test.ts` (parser only, so no browser is involved) |
| Unknown key name | `test/run/press.test.ts` |

Not tested: a press step whose mistyped key is combined with modifiers (for example `Control+Entr`); the error reports the full key as written.
