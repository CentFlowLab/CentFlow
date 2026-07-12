#!/usr/bin/env node
/**
 * Gera icon.png, splash-icon.png e android-icon-foreground.png
 * a partir do logo fonte fornecido pelo Manu.
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const BRAND_DIR = path.join(ROOT, 'assets', 'brand');
const IMAGES_DIR = path.join(ROOT, 'assets', 'images');
const SPLASH_BG = '#0A1628';

const SOURCE_CANDIDATES = [
  path.join(BRAND_DIR, 'centflow-logo-source-2026.png'),
  process.env.CENTFLOW_LOGO_SOURCE,
].filter(Boolean);

function lum(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function resolveSource() {
  for (const candidate of SOURCE_CANDIDATES) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Logo fonte não encontrado. Coloca centflow-logo-source-2026.png em assets/brand/`,
  );
}

/** Remove fundo escuro e devolve PNG RGBA com alpha real. */
async function extractMarkWithTransparency(sourcePath) {
  const img = sharp(sourcePath);
  const { data, info } = await img.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  // Separar monograma do wordmark (~gap em y≈385 num source 1024).
  const splitY = Math.floor(height * 0.375);
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;

  for (let y = 0; y < splitY; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const L = lum(data[i], data[i + 1], data[i + 2]);
      if (L > 35) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  const pad = Math.round(width * 0.02);
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(splitY - 1, maxY + pad);

  const cropW = maxX - minX + 1;
  const cropH = maxY - minY + 1;

  const cropped = await sharp(sourcePath)
    .extract({ left: minX, top: minY, width: cropW, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const out = Buffer.alloc(cropped.info.width * cropped.info.height * 4);
  const cw = cropped.info.width;
  const ch = cropped.info.height;

  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = (y * cw + x) * cropped.info.channels;
      const di = (y * cw + x) * 4;
      const r = cropped.data[si];
      const g = cropped.data[si + 1];
      const b = cropped.data[si + 2];
      const L = lum(r, g, b);

      let alpha = 255;
      if (L <= 28) {
        alpha = 0;
      } else if (L < 55) {
        alpha = Math.round(((L - 28) / (55 - 28)) * 255);
      }

      out[di] = r;
      out[di + 1] = g;
      out[di + 2] = b;
      out[di + 3] = alpha;
    }
  }

  return sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toBuffer();
}

async function placeOnCanvas(markPng, canvasSize, maxContentRatio) {
  const maxSide = Math.round(canvasSize * maxContentRatio);
  const markMeta = await sharp(markPng).metadata();
  const scale = Math.min(maxSide / markMeta.width, maxSide / markMeta.height);
  const targetW = Math.round(markMeta.width * scale);
  const targetH = Math.round(markMeta.height * scale);

  const resized = await sharp(markPng)
    .resize(targetW, targetH, { fit: 'inside', kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();

  const left = Math.round((canvasSize - targetW) / 2);
  const top = Math.round((canvasSize - targetH) / 2);

  return sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();
}

async function main() {
  const source = resolveSource();
  console.log(`Fonte: ${source}`);

  fs.mkdirSync(BRAND_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  // icon.png — quadrado com fundo sólido #0A1628 (sem depender de alpha).
  const iconPath = path.join(IMAGES_DIR, 'icon.png');
  await sharp(source)
    .resize(1024, 1024, { fit: 'cover' })
    .flatten({ background: SPLASH_BG })
    .removeAlpha()
    .png()
    .toFile(iconPath);
  console.log(`✓ ${iconPath}`);

  const markPng = await extractMarkWithTransparency(source);

  const splashPath = path.join(IMAGES_DIR, 'splash-icon.png');
  const splashCanvas = await placeOnCanvas(markPng, 1024, 0.38);
  await sharp(splashCanvas).png().toFile(splashPath);
  console.log(`✓ ${splashPath}`);

  const androidPath = path.join(IMAGES_DIR, 'android-icon-foreground.png');
  const androidCanvas = await placeOnCanvas(markPng, 1024, 0.66);
  await sharp(androidCanvas).png().toFile(androidPath);
  console.log(`✓ ${androidPath}`);

  // favicon derivado do ícone
  const faviconPath = path.join(IMAGES_DIR, 'favicon.png');
  await sharp(iconPath).resize(48, 48).png().toFile(faviconPath);
  console.log(`✓ ${faviconPath}`);
}

await main();
