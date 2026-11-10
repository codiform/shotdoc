# TODO MVC

The playwright website has an example of a TODO MVC application that demonstrates how to use Playwright for end-to-end testing.

When you first arrive on the TODO MVC page, you will see an empty list and a textbox where you can enter new tasks:

![empty](images/todo-mvc/empty.png)

You can type a task into that textbox:

![The TodoMVC app](images/todo-mvc/input.png)

After you finish typing in the task, press enter to add the task:

![One task in the list](images/todo-mvc/added.png)

Add two more tasks the same way:

![Three tasks in the list](images/todo-mvc/three-tasks.png)

## Completing a task

Each task has a checkbox. You can mark it complete by clicking the checkbox:

![The second task crossed out](images/todo-mvc/completed.png)

## Deleting and editing

The delete button appears only while the pointer is over a task. You can *hover* over the task to reveal a red 'x' button:

![The delete button showing on the third task](images/todo-mvc/delete-button.png)

Double-click a task to edit it. Then fill in the new text and press Enter to save:

![The third task in edit mode](images/todo-mvc/editing.png)

## Filtering and clearing

The links at the bottom filter the list. You can click the *Active* link to show only the active tasks:

![Only the tasks that are not completed](images/todo-mvc/active.png)

Or, you can clear the completed tasks with the link on the right, and then even when viewing *All* tasks, the completed tasks are gone:

![The list after clearing the completed task](images/todo-mvc/cleared.png)
