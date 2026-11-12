# TODO MVC

The playwright website has an example of a TODO MVC application that demonstrates how to use Playwright for end-to-end testing.

When you first arrive on the TODO MVC page, you will see an empty list and a textbox where you can enter new tasks:

```shotdoc
- goto: /
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

After you finish typing in the task, press enter to add the task:

```shotdoc
- press: Enter
- screenshot: {name: added, target: body, padding: 16, alt: One task in the list}
```

Add two more tasks the same way:

```shotdoc
- fill: {target: {role: textbox, name: What needs to be done}, value: Water the plants}
- press: Enter
- fill: {target: {role: textbox, name: What needs to be done}, value: Call the dentist}
- press: Enter
- screenshot: {name: three-tasks, target: body, padding: 16, alt: Three tasks in the list}
```

## Completing a task

Each task has a checkbox. You can mark it complete by clicking the checkbox:

```shotdoc
- click: "li:has-text('Water the plants') >> role=checkbox"
- wait: {text: 2 items left}
- unhover:
- screenshot: {name: completed, target: body, padding: 16, alt: The second task crossed out}
```

## Deleting and editing

The delete button appears only while the pointer is over a task. You can *hover* over the task to reveal a red 'x' button:

```shotdoc
- hover: "li:has-text('Call the dentist')"
- screenshot: {name: delete-button, target: body, padding: 16, alt: The delete button showing on the third task}
```

Double-click a task to edit it. Then fill in the new text and press Enter to save:

```shotdoc
- dblclick: {text: Call the dentist}
- fill: {target: {role: textbox, name: Edit}, value: Call the dentist at 3pm}
- screenshot: {name: editing, target: body, padding: 16, alt: The third task in edit mode}
- press: Enter
```

## Filtering and clearing

The links at the bottom filter the list. You can click the *Active* link to show only the active tasks:

```shotdoc
- click: {role: link, name: Active}
- wait: {hidden: {text: Water the plants}}
- screenshot: {name: active, target: body, padding: 16, alt: Only the tasks that are not completed}
```

Or, you can clear the completed tasks with the link on the right, and then even when viewing *All* tasks, the completed tasks are gone:

```shotdoc
- click: {role: link, name: All}
- wait: {visible: {text: Water the plants}}
- click: {role: button, name: Clear completed}
- wait: {hidden: {text: Water the plants}}
- screenshot: {name: cleared, target: body, padding: 16, alt: The list after clearing the completed task}
```
