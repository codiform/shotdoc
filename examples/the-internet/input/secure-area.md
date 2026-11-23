# The Secure Area

The Internet is a practice site with a page that only a logged-in user can open. Without a login, going to the secure area sends you back to the login page.

Once you are logged in, the secure area greets you:

```shotdoc
- goto: /secure
- wait: {visible: {text: Welcome to the Secure Area}}
- screenshot:
    name: secure-area
    target: "#content"
    alt: The secure area page
```

When you are done, the page has a Logout button:

```shotdoc
- screenshot:
    name: logout
    target: 'a[href="/logout"]'
    padding: 12
    alt: The Logout button
```
