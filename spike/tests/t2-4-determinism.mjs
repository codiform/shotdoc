import assert from 'node:assert/strict';
import { runTwice } from '../lib/determinism.js';
import { shot } from '../lib/render.js';

const stable = `<body style="margin:0;font:20px sans-serif"><h1>Static</h1><div style="width:200px;height:80px;background:teal"></div></body>`;

const staticResult = await runTwice('t2-4-static', async (page, path) => {
  await page.setContent(stable);
  await shot(page, path);
});
console.log('static  :', JSON.stringify({ ...staticResult, files: undefined }));
assert.equal(staticResult.exactDiff, 0);
assert.equal(staticResult.tolerantDiff, 0);
assert.equal(staticResult.byteIdentical, true);

const changingResult = await runTwice('t2-4-changing', async (page, path) => {
  const c = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
  await page.setContent(`<body style="margin:0"><div style="width:400px;height:300px;background:#${c}"></div><p>${Date.now()}</p></body>`);
  await shot(page, path);
});
console.log('changing:', JSON.stringify({ ...changingResult, files: undefined }));
assert.ok(changingResult.exactDiff > 0, 'a page that changes between runs must show differences');
assert.equal(changingResult.byteIdentical, false);
console.log('runner distinguishes static from changing pages');
