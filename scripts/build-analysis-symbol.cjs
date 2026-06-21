/* Gera assets/navigation/analysis-symbol.png — símbolo teal, transparente, crop justo. */
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const L = 256; // canvas lógico
const S = 4; // supersample
const N = L * S;
const TEAL = [94, 234, 212];

const mask = new Float32Array(N * N); // 0..1 cobertura (binário no high-res)

function setHi(x, y) {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  mask[(y | 0) * N + (x | 0)] = 1;
}

function fillDisk(cx, cy, r) {
  const Cx = cx * S, Cy = cy * S, R = r * S;
  const x0 = Math.max(0, Math.floor(Cx - R)), x1 = Math.min(N - 1, Math.ceil(Cx + R));
  const y0 = Math.max(0, Math.floor(Cy - R)), y1 = Math.min(N - 1, Math.ceil(Cy + R));
  const R2 = R * R;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = x - Cx, dy = y - Cy;
      if (dx * dx + dy * dy <= R2) mask[y * N + x] = 1;
    }
}

function bez3(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
  return [
    a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0],
    a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1],
  ];
}

function strokeBezier3(p0, p1, p2, p3, width) {
  const r = width / 2;
  for (let t = 0; t <= 1; t += 0.0012) {
    const p = bez3(p0, p1, p2, p3, t);
    fillDisk(p[0], p[1], r);
  }
}

function dotsBezier3(p0, p1, p2, p3, dotR, count) {
  for (let i = 0; i <= count; i++) {
    const p = bez3(p0, p1, p2, p3, i / count);
    fillDisk(p[0], p[1], dotR);
  }
}

function fillRoundedRect(x, y, w, h, rad) {
  const X0 = x * S, Y0 = y * S, W = w * S, H = h * S, R = rad * S;
  const x1 = X0 + W, y1 = Y0 + H;
  for (let py = Math.floor(Y0); py <= Math.ceil(y1); py++)
    for (let px = Math.floor(X0); px <= Math.ceil(x1); px++) {
      if (px < 0 || py < 0 || px >= N || py >= N) continue;
      let inside = px >= X0 && px <= x1 && py >= Y0 && py <= y1;
      // arredonda só os cantos de topo
      const corners = [
        [X0 + R, Y0 + R],
        [x1 - R, Y0 + R],
      ];
      for (const c of corners) {
        if (px < (c[0] === X0 + R ? X0 + R : x1 - R) === false) {}
      }
      // tratamento simples: cortar cantos superiores
      if (py < Y0 + R) {
        if (px < X0 + R) {
          const dx = px - (X0 + R), dy = py - (Y0 + R);
          if (dx * dx + dy * dy > R * R) inside = false;
        } else if (px > x1 - R) {
          const dx = px - (x1 - R), dy = py - (Y0 + R);
          if (dx * dx + dy * dy > R * R) inside = false;
        }
      }
      if (inside) mask[py * N + px] = 1;
    }
}

function fillTriangle(a, b, c) {
  const pts = [a, b, c].map((p) => [p[0] * S, p[1] * S]);
  const minX = Math.max(0, Math.floor(Math.min(pts[0][0], pts[1][0], pts[2][0])));
  const maxX = Math.min(N - 1, Math.ceil(Math.max(pts[0][0], pts[1][0], pts[2][0])));
  const minY = Math.max(0, Math.floor(Math.min(pts[0][1], pts[1][1], pts[2][1])));
  const maxY = Math.min(N - 1, Math.ceil(Math.max(pts[0][1], pts[1][1], pts[2][1])));
  const area = (p1, p2, p3) => (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const d1 = area(pts[0], pts[1], [x, y]);
      const d2 = area(pts[1], pts[2], [x, y]);
      const d3 = area(pts[2], pts[0], [x, y]);
      const neg = d1 < 0 || d2 < 0 || d3 < 0;
      const pos = d1 > 0 || d2 > 0 || d3 > 0;
      if (!(neg && pos)) mask[y * N + x] = 1;
    }
}

function arrowHead(tip, dir, size, halfW) {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / len, uy = dir[1] / len; // direção
  const nx = -uy, ny = ux; // normal
  const base = [tip[0] - ux * size, tip[1] - uy * size];
  const b1 = [base[0] + nx * halfW, base[1] + ny * halfW];
  const b2 = [base[0] - nx * halfW, base[1] - ny * halfW];
  fillTriangle(tip, b1, b2);
}

// ---- Composição do símbolo ----
const baseY = 184;
const bars = [
  { x: 92, w: 18, h: 30 },
  { x: 118, w: 18, h: 52 },
  { x: 144, w: 18, h: 72 },
  { x: 170, w: 18, h: 94 },
];
for (const b of bars) fillRoundedRect(b.x, baseY - b.h, b.w, b.h, 5);

// Seta curva principal — tendência ascendente por cima das barras, cabeça cima-direita
const c0 = [48, 152];
const c1 = [112, 120];
const c2 = [168, 70];
const c3 = [214, 46];
strokeBezier3(c0, c1, c2, c3, 10);
{
  const pPrev = bez3(c0, c1, c2, c3, 0.95);
  const dir = [c3[0] - pPrev[0], c3[1] - pPrev[1]];
  arrowHead(c3, dir, 27, 16);
}

// Arco pontilhado de tendência, paralelo e acima da seta principal
const d0 = [70, 128];
const d1 = [122, 96];
const d2 = [170, 50];
const d3 = [206, 30];
dotsBezier3(d0, d1, d2, d3, 3.0, 12);

// ---- Downsample para alpha ----
const full = new PNG({ width: L, height: L });
let minX = L, minY = L, maxX = 0, maxY = 0;
for (let y = 0; y < L; y++)
  for (let x = 0; x < L; x++) {
    let acc = 0;
    for (let sy = 0; sy < S; sy++)
      for (let sx = 0; sx < S; sx++) acc += mask[(y * S + sy) * N + (x * S + sx)];
    const a = Math.round((acc / (S * S)) * 255);
    const idx = (y * L + x) * 4;
    full.data[idx] = TEAL[0];
    full.data[idx + 1] = TEAL[1];
    full.data[idx + 2] = TEAL[2];
    full.data[idx + 3] = a;
    if (a > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

// ---- Crop justo (com margem mínima) ----
const pad = 6;
minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
maxX = Math.min(L - 1, maxX + pad); maxY = Math.min(L - 1, maxY + pad);
const cw = maxX - minX + 1, ch = maxY - minY + 1;
const out = new PNG({ width: cw, height: ch });
for (let y = 0; y < ch; y++)
  for (let x = 0; x < cw; x++) {
    const s = ((y + minY) * L + (x + minX)) * 4;
    const d = (y * cw + x) * 4;
    out.data[d] = full.data[s];
    out.data[d + 1] = full.data[s + 1];
    out.data[d + 2] = full.data[s + 2];
    out.data[d + 3] = full.data[s + 3];
  }

const outPath = path.join('assets', 'navigation', 'analysis-symbol.png');
fs.writeFileSync(outPath, PNG.sync.write(out));
console.log('written', outPath, cw + 'x' + ch);

// ---- Pré-visualização ASCII ----
const cols = 64, rows = 64;
let preview = '';
for (let r = 0; r < rows; r++) {
  let line = '';
  for (let c = 0; c < cols; c++) {
    const px = Math.floor((c / cols) * cw);
    const py = Math.floor((r / rows) * ch);
    const a = out.data[(py * cw + px) * 4 + 3];
    line += a > 200 ? '#' : a > 90 ? '+' : a > 20 ? '.' : ' ';
  }
  preview += line + '\n';
}
console.log(preview);
