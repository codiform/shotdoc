// Continue vs fresh: items added in one context must be visible when the session continues,
// and invisible from a brand-new context.
import assert from 'node:assert/strict';
import { launch, newStableContext } from '../lib/render.js';

const URL_ = 'https://demo.playwright.dev/todomvc/';
const count = (page) => page.locator('.todo-list li').count();

const browser = await launch();

// Session A: add two items.
const ctxA = await newStableContext(browser);
const a = await ctxA.newPage();
await a.goto(URL_);
for (const t of ['one', 'two']) {
  await a.locator('.new-todo').fill(t);
  await a.locator('.new-todo').press('Enter');
}
assert.equal(await count(a), 2);

// Continued: same context, navigate again (as a later block beginning with goto would).
await a.goto(URL_);
const continued = await count(a);

// Continued, new page in the same context.
const a2 = await ctxA.newPage();
await a2.goto(URL_);
const sameContextNewPage = await count(a2);

// Fresh: new context, no carried state.
const ctxB = await newStableContext(browser);
const b = await ctxB.newPage();
await b.goto(URL_);
const fresh = await count(b);

// Fresh but loading saved state captured from A (the named-state mechanism).
const saved = await ctxA.storageState();
const ctxC = await browser.newContext({ storageState: saved });
const c = await ctxC.newPage();
await c.goto(URL_);
const loaded = await count(c);

await browser.close();
console.log({ continued, sameContextNewPage, fresh, loadedFromStorageState: loaded });
assert.equal(continued, 2, 'continued session should still see items');
assert.equal(sameContextNewPage, 2, 'same context shares localStorage');
assert.equal(fresh, 0, 'fresh context must not see earlier items');
assert.equal(loaded, 2, 'state loaded from storageState should restore items (localStorage)');
console.log('continue / fresh / saved-state behave as expected');
