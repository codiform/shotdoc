# TodoMVC smoke (live)

Run by hand: `cd test/live && node ../../dist/cli.js build todomvc.md` (needs network).

```shotdoc
- goto: https://demo.playwright.dev/todomvc/
- wait: {visible: {role: textbox, name: What needs to be done}}
- screenshot: {name: empty}
```

```shotdoc
- fill: {target: {role: textbox, name: What needs to be done}, value: Buy milk}
- screenshot: {name: input, target: ".todoapp", padding: 12, alt: The TodoMVC app}
```
