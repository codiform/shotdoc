# Exploring a table in Datasette

Datasette publishes a table as a page you can filter, sort and facet. The `facetable` table in the public demo database is a small one to start with:

```shotdoc
- goto: /fixtures/facetable
- wait: {visible: {role: heading, name: facetable}}
- wait: {network: idle}
- screenshot:
    name: table
    target: body
    padding: 0
    alt: The facetable table with its filters and its rows
    mask: [{text: Queries took}]
```

The footer reports how long the queries took, which changes every time the page loads, so the footer is covered in the picture above.

## Column actions

Each column has a gear button that opens a menu of things you can do with that column. Open the menu for the `state` column:

```shotdoc
- click: {role: button, name: Actions for column state}
- wait: {visible: {role: menuitem, name: Facet by this}}
- screenshot:
    name: column-menu
    target: th.col-state
    include: ["#column-actions-menu"]
    alt: The menu for the state column
    annotate:
      - arrow: {target: {role: menuitem, name: Facet by this}, from: right}
```

*Facet by this* counts how many rows have each value in the column. Choose it:

```shotdoc
- click: {role: menuitem, name: Facet by this}
- wait: {visible: ".facet-results"}
- screenshot:
    name: facet
    target: .facet-info
    alt: The state facet, showing how many rows each state has
```

## Filtering and sorting

The form above the table filters and sorts the rows. It has four controls, numbered here in the order you use them:

```shotdoc
- screenshot:
    name: filter-form
    target: form.filters
    alt: The filter form with four numbered controls
    annotate:
      - badge: "select[name=_filter_column]"
      - badge: "select[name=_filter_op]"
      - badge: "input[name=_filter_value]"
      - badge: {role: button, name: Apply filters}
```

1. Choose the column to filter on.
2. Choose how to compare it, such as `=` or `contains`.
3. Type the value to compare against.
4. Apply the filter.

To list the rows from the last to the first, tick *descending* and apply:

```shotdoc
- click: {label: descending}
- click: {role: button, name: Apply filters}
- wait: {visible: {text: "pk ▲"}}
- screenshot:
    name: descending
    target: table.rows-and-columns
    alt: The table with its rows in descending order
```
