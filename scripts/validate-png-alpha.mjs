#!/usr/bin/env node
/**
 * Valida que um PNG tem transparência real (canal alpha não-uniforme).
 * Uso: node scripts/validate-png-alpha.mjs <ficheiro.png> [--require-transparent]
 */
import sharp from 'sharp';
import path from 'path';

const args = process.argv.slice(2);
const requireTransparent = args.includes('--require-transparent');
const files = args.filter((a) => !a.startsWith('--'));

if (files.length === 0) {
  console.error('Uso: node scripts/validate-png-alpha.mjs <ficheiro.png> [--require-transparent]');
  process.exit(1);
}

function analyzeAlpha(filePath) {
  return sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
    .then(({ data, info }) => {
      let min = 255;
      let max = 0;
      const unique = new Set();
      let transparent = 0;
      let semi = 0;

      for (let i = 3; i < data.length; i += 4) {
        const a = data[i];
        if (a < min) min = a;
        if (a > max) max = a;
        unique.add(a);
        if (a === 0) transparent++;
        else if (a < 250) semi++;
      }

      const total = data.length / 4;
      return {
        file: path.basename(filePath),
        width: info.width,
        height: info.height,
        alphaMin: min,
        alphaMax: max,
        uniqueAlphaValues: unique.size,
        fullyTransparentPixels: transparent,
        semiTransparentPixels: semi,
        totalPixels: total,
        hasRealTransparency: unique.size > 1 && (transparent > 0 || semi > 0),
        isUniformlyOpaque: unique.size === 1 && min === 255,
      };
    });
}

let failed = false;

for (const file of files) {
  const result = await analyzeAlpha(file);
  console.log(JSON.stringify(result, null, 2));

  if (requireTransparent && !result.hasRealTransparency) {
    console.error(`❌ ${result.file}: sem transparência real (alpha uniforme ou opaco).`);
    failed = true;
  } else if (requireTransparent) {
    console.log(`✅ ${result.file}: transparência real confirmada.`);
  }
}

process.exit(failed ? 1 : 0);
