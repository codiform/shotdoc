# Example walkthrough

This document is a shotdoc source. Without building, each block below is a readable code block.

## The home page

```shotdoc
- goto: /form.html
- screenshot: {name: form, alt: The form page}
```

Fill in the form and save it:

```shotdoc
- fill: {target: {label: Email}, value: ada@example.test}
- click: {role: button, name: Save}
- wait: {text: saved}
- screenshot: {name: saved, target: "#out", padding: 8}
```

## Updating a list

```shotdoc
- goto: /delayed.html
- click: "#update"
- wait: {text: 2 items left}
- wait: {hidden: "#spinner"}
- screenshot: {name: count, target: "#count"}
```

A block that takes no screenshot disappears from the built document:

```shotdoc
- goto: /menu.html
```

## A header with its menu

```shotdoc
- screenshot:
    name: menu
    target: "#header"
    include: ["#menu"]
    padding: 0
    alt: Header with its menu open
```

```yaml
# not a shotdoc block: left exactly as written
- goto: /
```

Done.
