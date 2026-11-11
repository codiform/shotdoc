import { type Browser, chromium } from 'playwright';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { type FixtureServer, startFixtureServer } from './helpers/server.js';

let server: FixtureServer;
let browser: Browser;
beforeAll(async () => {
  server = await startFixtureServer();
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser.close();
  await server.close();
});

test('rows.html has three identically named checkboxes and a hover-only delete control', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/rows.html`);
  expect(await page.getByRole('checkbox', { name: 'Toggle Todo' }).count()).toBe(3);
  expect(await page.getByRole('listitem').count()).toBe(3);
  const del = page.locator('li:has-text("Ship it") .destroy');
  expect(await del.isVisible()).toBe(false);
  await page.locator('li:has-text("Ship it")').hover();
  expect(await del.isVisible()).toBe(true);
});

test('rows.html edits on double-click: Enter commits, Escape cancels', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/rows.html`);
  await page.getByText('Write the docs').dblclick();
  await page.locator('input.edit').fill('Write more docs');
  await page.keyboard.press('Enter');
  expect(await page.locator('li').first().innerText()).toBe('Write more docs');
  await page.getByText('Ship it').dblclick();
  await page.locator('input.edit').fill('changed');
  await page.keyboard.press('Escape');
  expect(await page.locator('li').nth(2).innerText()).toBe('Ship it');
});

test('keys.html records the key, modifiers and target of each keydown', async () => {
  const page = await browser.newPage();
  await page.goto(`${server.url}/keys.html`);
  await page.locator('#field').focus();
  await page.keyboard.press('Control+A');
  // Holding Control is itself a keydown, so the log is `Control|C|field` then `A|C|field`.
  expect((await page.locator('#log').innerText()).trim().split('\n')).toEqual(['Control|C|field', 'A|C|field']);
});
