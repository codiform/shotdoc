import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

/** The cookie value a successful login sets: tests check it never leaks into output. */
export const SESSION_VALUE = 'fixture-session-value-7f3a9c';

const page = (body: string) => `<!doctype html><html><head><title>Fixture</title></head><body>${body}</body></html>`;

const LOGIN_FORM = page(`<h1>Login Page</h1>
<form method="post" action="/login">
  <label>Username <input name="username"></label>
  <label>Password <input name="password" type="password"></label>
  <button type="submit">Login</button>
</form>`);

export interface AuthServer {
  url: string;
  close(): Promise<void>;
}

/**
 * A small app with a cookie login, for testing saved logins without a real identity provider:
 * - `/login` always shows the form (even when logged in); a POST sets a session cookie and goes to `/secure`
 * - `/secure` redirects to `/login` when logged out, and shows "Secure Area" when logged in
 * - `/inventory` answers 404 with content when logged in (like a static site's single-page app), plain 404 otherwise
 * - `/` shows "Sign in" when logged out and "Sign out" when logged in
 */
export async function startAuthServer(): Promise<AuthServer> {
  const server: Server = createServer((req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const loggedIn = (req.headers.cookie ?? '').split(/;\s*/).includes(`sid=${SESSION_VALUE}`);
    const html = (status: number, body: string) => {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page(body));
    };
    if (path === '/login' && req.method === 'POST') {
      req.resume();
      req.on('end', () => {
        res.writeHead(303, { location: '/secure', 'set-cookie': `sid=${SESSION_VALUE}; Path=/; HttpOnly` });
        res.end();
      });
    } else if (path === '/login') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(LOGIN_FORM);
    } else if (path === '/secure') {
      if (!loggedIn) {
        res.writeHead(303, { location: '/login' });
        res.end();
      } else {
        html(200, '<h1>Secure Area</h1><p>Welcome to the secure area.</p>');
      }
    } else if (path === '/inventory') {
      if (loggedIn) {
        html(404, '<h1>Inventory</h1><p>Backpack</p>');
      } else {
        html(404, '<p>not found</p>');
      }
    } else if (path === '/') {
      html(200, loggedIn ? '<h1>Home</h1><a href="/">Sign out</a>' : '<h1>Home</h1><a href="/login">Sign in</a>');
    } else {
      html(404, '<p>not found</p>');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
