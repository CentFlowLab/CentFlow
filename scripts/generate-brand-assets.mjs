// Gera todos os ícones da marca Miven (logótipo B) a partir de geometria (SDF), sem
// dependências externas: app, PWA, site miven.pt e emails.
// Uso: node scripts/generate-brand-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Logótipo B (ADR-036): moeda verde com um "m" em negativo e uma seta para cima.
// Manter sincronizado com src/ui/theme/colors.ts (BRAND).
const NAVY = [0x10, 0x1b, 0x2d];
const EMERALD = [0x10, 0xb9, 0x81];
const MINT = [0x6e, 0xe7, 0xb7];
const WHITE = [0xff, 0xff, 0xff];

// Geometria em unidades do mosaico (lado 1, origem no centro, y para baixo), a partir do SVG
// da proposta B (mosaico de 140 px).
const U = (v) => v / 140;
const COIN = { r: U(48) };
const M_STROKE = U(9) / 2;
const M_LEGS = [
  [U(-20), U(22), U(-20), U(-8)],
  [U(0), U(22), U(0), U(-8)],
  [U(20), U(22), U(20), U(-8)],
];
const M_ARCS = [
  [U(-10), U(-8), U(10)],
  [U(10), U(-8), U(10)],
];
const ARROW_STROKE = U(7) / 2;
const ARROW = [
  [U(22), U(-36), U(34), U(-48)],
  [U(34), U(-48), U(46), U(-36)],
  [U(34), U(-48), U(34), U(-22)],
];

// ---------- PNG encoding ----------
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- Geometria (SDF) ----------
function sdRoundedSquare(x, y, halfSize, radius) {
  const qx = Math.abs(x) - halfSize + radius;
  const qy = Math.abs(y) - halfSize + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function sdSegment(x, y, [ax, ay, bx, by]) {
  const px = x - ax;
  const py = y - ay;
  const dx = bx - ax;
  const dy = by - ay;
  const h = Math.max(0, Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - dx * h, py - dy * h);
}

/** Meia circunferência de cima (y menor que o centro), como os arcos do "m". */
function sdUpperArc(x, y, [cx, cy, r]) {
  if (y <= cy) return Math.abs(Math.hypot(x - cx, y - cy) - r);
  return Math.min(Math.hypot(x - (cx - r), y - cy), Math.hypot(x - (cx + r), y - cy));
}

function strokes(x, y, s) {
  const lx = x / s;
  const ly = y / s;
  let m = Infinity;
  for (const leg of M_LEGS) m = Math.min(m, sdSegment(lx, ly, leg));
  for (const arc of M_ARCS) m = Math.min(m, sdUpperArc(lx, ly, arc));
  let arrow = Infinity;
  for (const seg of ARROW) arrow = Math.min(arrow, sdSegment(lx, ly, seg));
  return {
    coin: (Math.hypot(lx, ly) - COIN.r) * s,
    m: (m - M_STROKE) * s,
    arrow: (arrow - ARROW_STROKE) * s,
  };
}

function coverage(distance, pixel) {
  return Math.min(1, Math.max(0, 0.5 - distance / pixel));
}

function over(base, baseAlpha, color, alpha) {
  const outAlpha = alpha + baseAlpha * (1 - alpha);
  if (outAlpha === 0) return [base, 0];
  return [
    base.map((c, i) => (color[i] * alpha + c * baseAlpha * (1 - alpha)) / outAlpha),
    outAlpha,
  ];
}

/**
 * @param {number} size
 * @param {{ background: 'full' | 'rounded' | 'none', markScale: number, mono?: boolean, mark?: boolean }} opts
 */
function render(size, { background, markScale, mono = false, mark = true }) {
  const out = Buffer.alloc(size * size * 4);
  const pixel = 1 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size - 0.5;
      const y = (py + 0.5) / size - 0.5;
      let color = NAVY;
      let alpha = 0;
      if (background !== 'none') {
        alpha = background === 'full' ? 1 : coverage(sdRoundedSquare(x, y, 0.5, 0.225), pixel);
      }
      if (mark) {
        const d = strokes(x, y, markScale);
        const coin = coverage(d.coin, pixel);
        const m = coverage(d.m, pixel);
        const arrow = coverage(d.arrow, pixel);
        if (mono) {
          // Monocromático: moeda e seta brancas, "m" recortado (transparente).
          const shape = Math.max(coin * (1 - m), arrow);
          [color, alpha] = over(color, alpha, WHITE, shape);
        } else {
          [color, alpha] = over(color, alpha, EMERALD, coin);
          [color, alpha] = over(color, alpha, NAVY, m * coin);
          [color, alpha] = over(color, alpha, MINT, arrow);
        }
      }
      const o = (py * size + px) * 4;
      out[o] = Math.round(color[0]);
      out[o + 1] = Math.round(color[1]);
      out[o + 2] = Math.round(color[2]);
      out[o + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, out);
}

const TARGETS = [
  ['assets/icon.png', 1024, { background: 'full', markScale: 1 }],
  ['assets/android-icon-foreground.png', 1024, { background: 'none', markScale: 0.7 }],
  ['assets/android-icon-background.png', 1024, { background: 'full', markScale: 1, mark: false }],
  ['assets/android-icon-monochrome.png', 1024, { background: 'none', markScale: 0.7, mono: true }],
  ['assets/splash-icon.png', 1024, { background: 'rounded', markScale: 1 }],
  ['assets/favicon.png', 64, { background: 'rounded', markScale: 1.15 }],
  ['public/icons/icon-192.png', 192, { background: 'rounded', markScale: 1 }],
  ['public/icons/icon-512.png', 512, { background: 'rounded', markScale: 1 }],
  ['public/icons/icon-maskable-512.png', 512, { background: 'full', markScale: 0.8 }],
  ['public/icons/apple-touch-icon.png', 180, { background: 'full', markScale: 1 }],
  ['site/assets/logo.png', 256, { background: 'rounded', markScale: 1 }],
  ['site/favicon.png', 64, { background: 'rounded', markScale: 1.15 }],
  ['site/assets/email-logo.png', 120, { background: 'rounded', markScale: 1 }],
];

for (const [path, size, opts] of TARGETS) {
  const file = resolve(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(size, opts));
  console.log(`✓ ${path} (${size}×${size})`);
}
