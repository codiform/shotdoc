# TODO MVC

The playwright website has an example of a TODO MVC application that demonstrates how to use Playwright for end-to-end testing.

When you first arrive on the TODO MVC page, you will see an empty list and a textbox where you can enter new tasks:

```shotdoc
- goto: ./
- wait: {visible: {role: textbox, name: What needs to be done}}
- screenshot:
    name: empty
    target: body
    padding: 16
```

You can type a task into that textbox:

```shotdoc
- fill: {target: {role: textbox, name: What needs to be done}, value: Buy milk}
- screenshot: {name: input, target: ".todoapp", padding: 12, alt: The TodoMVC app}
```
