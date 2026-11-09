// Annotations as DOM injected into an overlay container that is out of normal flow.
// Every function positions from the target's bounding box at call time and returns
// the annotation's bounds in DOCUMENT coordinates (so a capture can include it).

const OVERLAY_ID = '__doxer_overlay';
const COLOR = '#ff31a0';

// Runs in the page. Ensures the overlay exists and returns it.
const ensureOverlay = `
  (() => {
    let o = document.getElementById('${OVERLAY_ID}');
    if (!o) {
      o = document.createElement('div');
      o.id = '${OVERLAY_ID}';
      o.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;overflow:visible;pointer-events:none;z-index:2147483647;';
      document.documentElement.appendChild(o);
    }
    return o;
  })()
`;

function docRect(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height };
}

export async function highlight(locator, { color = COLOR, outset = 4, width = 3 } = {}) {
  return locator.evaluate(
    (el, { ensure, color, outset, width }) => {
      const o = eval(ensure);
      const r = el.getBoundingClientRect();
      const b = {
        x: r.left + window.scrollX - outset,
        y: r.top + window.scrollY - outset,
        width: r.width + outset * 2,
        height: r.height + outset * 2,
      };
      const d = document.createElement('div');
      d.dataset.doxer = 'highlight';
      d.style.cssText = `position:absolute;box-sizing:border-box;border:${width}px solid ${color};border-radius:4px;left:${b.x}px;top:${b.y}px;width:${b.width}px;height:${b.height}px;`;
      o.appendChild(d);
      return b;
    },
    { ensure: ensureOverlay, color, outset, width },
  );
}

// `from` is the side the arrow sits on; it points at the element.
export async function arrow(locator, { from = 'left', gap = 6, color = COLOR } = {}) {
  return locator.evaluate(
    (el, { ensure, from, gap, color }) => {
      const o = eval(ensure);
      const r = el.getBoundingClientRect();
      const L = r.left + window.scrollX, T = r.top + window.scrollY;
      const horizontal = from === 'left' || from === 'right';
      const w = horizontal ? 80 : 40, h = horizontal ? 40 : 80;
      const transform = {
        left: '',
        right: 'translate(80,0) scale(-1,1)',
        top: 'translate(40,0) rotate(90)',
        bottom: 'translate(0,80) rotate(-90)',
      }[from];
      if (transform === undefined) throw new Error(`arrow: unknown direction ${from}`);
      const pos = {
        left: { x: L - gap - w, y: T + r.height / 2 - h / 2 },
        right: { x: L + r.width + gap, y: T + r.height / 2 - h / 2 },
        top: { x: L + r.width / 2 - w / 2, y: T - gap - h },
        bottom: { x: L + r.width / 2 - w / 2, y: T + r.height + gap },
      }[from];
      const wrap = document.createElement('div');
      wrap.dataset.doxer = 'arrow';
      wrap.style.cssText = `position:absolute;left:${pos.x}px;top:${pos.y}px;width:${w}px;height:${h}px;`;
      wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
        <g transform="${transform}"><polygon fill="${color}" stroke="#fff" stroke-width="2"
          points="0,15 50,15 50,0 80,20 50,40 50,25 0,25"/></g></svg>`;
      o.appendChild(wrap);
      return { x: pos.x, y: pos.y, width: w, height: h };
    },
    { ensure: ensureOverlay, from, gap, color },
  );
}

export async function badge(locator, number, { size = 28, color = COLOR } = {}) {
  return locator.evaluate(
    (el, { ensure, number, size, color }) => {
      const o = eval(ensure);
      const r = el.getBoundingClientRect();
      const x = r.left + window.scrollX - size / 2, y = r.top + window.scrollY - size / 2;
      const d = document.createElement('div');
      d.dataset.doxer = 'badge';
      d.textContent = String(number);
      d.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;font:bold ${Math.round(size * 0.55)}px/${size}px sans-serif;text-align:center;border:2px solid #fff;box-sizing:border-box;`;
      o.appendChild(d);
      return { x, y, width: size, height: size };
    },
    { ensure: ensureOverlay, number, size, color },
  );
}

export async function clearAnnotations(page) {
  await page.evaluate((id) => document.getElementById(id)?.remove(), OVERLAY_ID);
}

export const _internal = { OVERLAY_ID };
