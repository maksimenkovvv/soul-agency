// Favicon badge (counter) for unread items.
// Draws over the current favicon using canvas and sets link[rel~="icon"].href to a dataURL.

let originalHref = null;
let originalTitle = null;
const cache = new Map(); // count -> dataURL

function getLink() {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.querySelector('link[rel*="icon"]');
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  return link;
}

function safeText(count) {
  if (count > 99) return '99+';
  return String(Math.max(0, count));
}

async function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function makeDataUrl(baseHref, count) {
  const key = safeText(count);
  if (cache.has(key)) return cache.get(key);

  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Try to draw base favicon; if fails, just draw badge.
  try {
    const img = await loadImage(baseHref);
    ctx.drawImage(img, 0, 0, size, size);
  } catch {
    // transparent background
  }

  const text = safeText(count);
  // badge circle
  const r = 16;
  const cx = size - r;
  const cy = r;

  // shadow
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();

  // main badge
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#FF3B6B';
  ctx.fill();

  // outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();

  // text
  ctx.fillStyle = '#FFFFFF';
  ctx.font = text.length <= 2 ? 'bold 18px system-ui, -apple-system, Segoe UI, Roboto' : 'bold 15px system-ui, -apple-system, Segoe UI, Roboto';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, cx, cy + 0.5);

  const url = canvas.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

export function restoreFavicon() {
  const link = getLink();
  if (originalHref) link.href = originalHref;
  if (originalTitle) document.title = originalTitle;
}

// Updates favicon and title for the given count.
// Returns a promise because drawing may require loading the base icon.
export async function setFaviconBadge(count, opts = {}) {
  const link = getLink();
  if (!originalHref) originalHref = link.href;
  if (!originalTitle) originalTitle = document.title;

  const n = Number(count || 0);
  if (!Number.isFinite(n) || n <= 0) {
    restoreFavicon();
    return;
  }

  const baseHref = originalHref || link.href;
  const dataUrl = await makeDataUrl(baseHref, n);
  link.href = dataUrl;

  // optional title badge
  if (opts.withTitle !== false) {
    const base = originalTitle || document.title || '';
    const prefix = `(${safeText(n)}) `;
    if (!base.startsWith(prefix)) {
      document.title = prefix + base.replace(/^\(\d+\+?\)\s*/, '');
    }
  }
}