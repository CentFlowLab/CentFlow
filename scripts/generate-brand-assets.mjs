// Gera todos os ícones da marca CentFlow a partir de geometria (SDF) sem dependências externas.
// Uso: node scripts/generate-brand-assets.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Manter sincronizado com src/ui/theme/palette.ts (brand).
const GRADIENT_START = [0x6d, 0x6c, 0xff];
const GRADIENT_END = [0x3b, 0x2f, 0xc9];
const WHITE = [0xff, 0xff, 0xff];

const MARK = {
  radius: 0.22,
  thickness: 0.078,
  gapHalfAngle: (42 * Math.PI) / 180,
  dotRadius: 0.048,
};

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

// ---------- Geometry (unit space, origin at canvas centre) ----------
function sdRoundedSquare(x, y, halfSize, radius) {
  const qx = Math.abs(x) - halfSize + radius;
  const qy = Math.abs(y) - halfSize + radius;
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

function sdMark(x, y, scale) {
  const r = MARK.radius * scale;
  const t = (MARK.thickness * scale) / 2;
  const g = MARK.gapHalfAngle;
  const angle = Math.abs(Math.atan2(y, x));
  let ring;
  if (angle >= g) {
    ring = Math.abs(Math.hypot(x, y) - r) - t;
  } else {
    const ex = r * Math.cos(g);
    const ey = r * Math.sin(g);
    ring = Math.min(Math.hypot(x - ex, y - ey), Math.hypot(x - ex, y + ey)) - t;
  }
  const dot = Math.hypot(x - r, y) - MARK.dotRadius * scale;
  return Math.min(ring, dot);
}

function coverage(distance, pixel) {
  return Math.min(1, Math.max(0, 0.5 - distance / pixel));
}

function mix(a, b, t) {
  return a.map((v, i) => v + (b[i] - v) * t);
}

/**
 * @param {number} size
 * @param {{ background: 'full' | 'rounded' | 'none', markScale: number, markColor: number[] | null }} opts
 */
function render(size, { background, markScale, markColor }) {
  const out = Buffer.alloc(size * size * 4);
  const pixel = 1 / size;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) / size - 0.5;
      const y = (py + 0.5) / size - 0.5;
      let color = [0, 0, 0];
      let alpha = 0;

      if (background !== 'none') {
        const bgAlpha =
          background === 'full' ? 1 : coverage(sdRoundedSquare(x, y, 0.5, 0.225), pixel);
        const t = (x + y + 1) / 2;
        color = mix(GRADIENT_START, GRADIENT_END, t);
        alpha = bgAlpha;
      }

      if (markColor) {
        const markAlpha = coverage(sdMark(x, y, markScale), pixel);
        const outAlpha = markAlpha + alpha * (1 - markAlpha);
        if (outAlpha > 0) {
          color = color.map(
            (c, i) => (markColor[i] * markAlpha + c * alpha * (1 - markAlpha)) / outAlpha,
          );
        }
        alpha = outAlpha;
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
  ['assets/icon.png', 1024, { background: 'full', markScale: 1, markColor: WHITE }],
  [
    'assets/android-icon-foreground.png',
    1024,
    { background: 'none', markScale: 1, markColor: WHITE },
  ],
  [
    'assets/android-icon-background.png',
    1024,
    { background: 'full', markScale: 1, markColor: null },
  ],
  [
    'assets/android-icon-monochrome.png',
    1024,
    { background: 'none', markScale: 1, markColor: WHITE },
  ],
  ['assets/splash-icon.png', 1024, { background: 'rounded', markScale: 1.1, markColor: WHITE }],
  ['assets/favicon.png', 64, { background: 'rounded', markScale: 1.2, markColor: WHITE }],
  ['public/icons/icon-192.png', 192, { background: 'rounded', markScale: 1.1, markColor: WHITE }],
  ['public/icons/icon-512.png', 512, { background: 'rounded', markScale: 1.1, markColor: WHITE }],
  [
    'public/icons/icon-maskable-512.png',
    512,
    { background: 'full', markScale: 0.85, markColor: WHITE },
  ],
  [
    'public/icons/apple-touch-icon.png',
    180,
    { background: 'full', markScale: 1, markColor: WHITE },
  ],
];

for (const [path, size, opts] of TARGETS) {
  const file = resolve(ROOT, path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, render(size, opts));
  console.log(`✓ ${path} (${size}×${size})`);
}
