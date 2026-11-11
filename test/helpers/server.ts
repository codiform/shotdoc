import { readFile } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'fixtures');
const types: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
};

export interface FixtureServer {
  url: string;
  close(): Promise<void>;
}

/** Serves test/fixtures over HTTP on a free port. `/` serves index.html. */
export async function startFixtureServer(): Promise<FixtureServer> {
  const server: Server = createServer(async (req, res) => {
    const path = new URL(req.url ?? '/', 'http://x').pathname;
    const rel = normalize(path === '/' ? '/index.html' : path);
    if (rel.includes('..')) {
      res.writeHead(400).end();
      return;
    }
    try {
      const body = await readFile(join(root, rel));
      res.writeHead(200, { 'content-type': types[extname(rel)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
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
