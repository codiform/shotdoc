// play.grafana.org: dynamic (random, auto-refreshing) data. Three variants of the same panel:
//   unmasked -> expect run-to-run differences
//   masked   -> panel content painted over with a solid box
//   frozen   -> query responses recorded on run 1 and replayed on run 2
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { runTwice, colorVariety } from '../lib/determinism.js';
import { captureElement } from '../lib/capture.js';

const URL_ = 'https://play.grafana.org/d/vmie2cmWz?orgId=1&from=1700000000000&to=1700021600000&kiosk';
const PANEL = 'data-testid Panel header Gradient mode';
const ctxOpts = { viewport: { width: 1280, height: 1100 } };
const REC = new URL('../out/grafana-frozen.json', import.meta.url).pathname;
mkdirSync(new URL('../out/', import.meta.url).pathname, { recursive: true });

async function open(page, url = URL_) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  const panel = page.getByTestId(PANEL);
  await panel.waitFor();
  await page.getByTestId('data-testid Bar gauge value').first().waitFor();
  await page.waitForTimeout(1500); // let bars finish rendering
  return panel;
}

// Normalise a query request so run 1 and run 2 produce the same key.
function key(req) {
  try {
    const b = JSON.parse(req.postData() || '{}');
    return JSON.stringify({
      q: (b.queries || []).map(({ requestId, ...q }) => { delete q.intervalMs; delete q.maxDataPoints; return q; }),
      from: b.from, to: b.to,
    });
  } catch { return req.postData() || ''; }
}

const LIVE = 'https://play.grafana.org/d/vmie2cmWz?orgId=1&from=now-6h&to=now&kiosk'; // relative range: data moves
const results = {};

results.unmasked = await runTwice('grafana-unmasked', async (page, path) => {
  const panel = await open(page);
  await captureElement(page, panel, path, { padding: 8 });
}, { ctxOpts });

results.masked = await runTwice('grafana-masked', async (page, path) => {
  const panel = await open(page);
  await captureElement(page, panel, path, {
    padding: 8,
    mask: [panel.getByTestId('data-testid panel content')],
    maskColor: '#555555',
  });
}, { ctxOpts });

results.liveUnmasked = await runTwice('grafana-live-unmasked', async (page, path) => {
  const panel = await open(page, LIVE);
  await captureElement(page, panel, path, { padding: 8 });
}, { ctxOpts });

results.liveMasked = await runTwice('grafana-live-masked', async (page, path) => {
  const panel = await open(page, LIVE);
  await captureElement(page, panel, path, {
    padding: 8,
    mask: [panel.getByTestId('data-testid panel content')],
    maskColor: '#555555',
  });
}, { ctxOpts });

let recorded = 0, replayed = 0, missed = 0;
results.frozen = await runTwice('grafana-frozen', async (page, path, n) => {
  if (n === 1) {
    const rec = {};
    await page.route('**/api/ds/query**', async (route) => {
      const res = await route.fetch();
      rec[key(route.request())] = { status: res.status(), headers: res.headers(), body: (await res.body()).toString('base64') };
      recorded++;
      await route.fulfill({ response: res });
    });
    const panel = await open(page);
    writeFileSync(REC, JSON.stringify(rec));
    await captureElement(page, panel, path, { padding: 8 });
  } else {
    const rec = JSON.parse(readFileSync(REC, 'utf8'));
    await page.route('**/api/ds/query**', async (route) => {
      const hit = rec[key(route.request())];
      if (!hit) { missed++; return route.continue(); }
      replayed++;
      await route.fulfill({ status: hit.status, headers: hit.headers, body: Buffer.from(hit.body, 'base64') });
    });
    const panel = await open(page);
    await captureElement(page, panel, path, { padding: 8 });
  }
}, { ctxOpts });

const brief = (r) => ({ colors: colorVariety(r.files[0]), byteIdentical: r.byteIdentical, size: r.sizeA, exactDiff: r.exactDiff, tolerantDiff: r.tolerantDiff, total: r.total });
for (const [k, v] of Object.entries(results)) console.log(k.padEnd(9), JSON.stringify(brief(v)));
console.log(`frozen: recorded ${recorded} responses, replayed ${replayed}, missed ${missed}`);
