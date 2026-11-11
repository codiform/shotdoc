import { afterAll, beforeAll, expect, test } from 'vitest';
import { type FixtureServer, startFixtureServer } from './helpers/server.js';

let server: FixtureServer;
beforeAll(async () => {
  server = await startFixtureServer();
});
afterAll(async () => {
  await server.close();
});

test('serves fixtures and 404s unknown paths', async () => {
  const ok = await fetch(`${server.url}/`);
  expect(ok.status).toBe(200);
  expect(await ok.text()).toContain('Fixture');
  expect((await fetch(`${server.url}/nope`)).status).toBe(404);
});

test('shuts down cleanly', async () => {
  const s = await startFixtureServer();
  await s.close();
  await expect(fetch(`${s.url}/`)).rejects.toThrow();
});
