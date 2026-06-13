import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

/** Contraste para texto de talões (1 = sem alteração). */
const CONTRAST_FACTOR = 1.78;
/** Brilho leve após contraste (-255..255). */
const BRIGHTNESS_OFFSET = 8;
/** Limiar para binarização suave (talões térmicos / baixo contraste). */
const SOFT_THRESHOLD = 152;
/** Intensidade do unsharp mask (nitidez). */
const SHARPEN_AMOUNT = 0.72;
/** Percentis para stretch de histograma (melhora fotos escuras/clipped). */
const HISTOGRAM_LOW_PERCENTILE = 0.04;
const HISTOGRAM_HIGH_PERCENTILE = 0.96;
/** Acima disto usa enhancement leve (sem blur) para evitar OOM no telemóvel */
const LIGHTWEIGHT_PIXEL_THRESHOLD = 900_000;

export type EnhanceReceiptOptions = {
  lightweight?: boolean;
  /** Binarização mais forte — útil em talões térmicos */
  strongBinarization?: boolean;
};

function uint8ToBase64(bytes: Uint8Array): string {
  const chunk = 8192;
  const parts: string[] = [];

  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    let binary = '';
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
    parts.push(binary);
  }

  return btoa(parts.join(''));
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function rgbToGray(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

function stretchHistogram(gray: Float32Array): { low: number; high: number } {
  const sampleStep = gray.length > 400_000 ? 4 : 1;
  const samples: number[] = [];

  for (let i = 0; i < gray.length; i += sampleStep) {
    samples.push(gray[i]);
  }

  samples.sort((a, b) => a - b);
  const low = percentile(samples, HISTOGRAM_LOW_PERCENTILE);
  const high = percentile(samples, HISTOGRAM_HIGH_PERCENTILE);
  return { low, high: Math.max(high, low + 24) };
}

function applySoftBinarization(value: number, strong = false): number {
  const threshold = strong ? SOFT_THRESHOLD - 12 : SOFT_THRESHOLD;
  if (value < threshold) {
    return value * (strong ? 0.38 : 0.5);
  }
  return 255 - (255 - value) * (strong ? 0.22 : 0.32);
}

function boxBlurGray(gray: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(gray.length);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || ny >= height || nx < 0 || nx >= width) continue;
          sum += gray[ny * width + nx];
          count++;
        }
      }

      out[y * width + x] = sum / count;
    }
  }

  return out;
}

/**
 * Melhora legibilidade OCR: grayscale + stretch + contraste + nitidez + binarização suave.
 */
export function enhanceReceiptPixels(
  rgba: Uint8Array,
  width: number,
  height: number,
  options: EnhanceReceiptOptions = {},
): Uint8Array {
  const pixelCount = width * height;
  const out = new Uint8Array(rgba.length);
  const lightweight = options.lightweight ?? pixelCount > LIGHTWEIGHT_PIXEL_THRESHOLD;
  const strongBinarization = options.strongBinarization ?? false;

  const gray = new Float32Array(pixelCount);

  for (let px = 0; px < pixelCount; px++) {
    const i = px * 4;
    gray[px] = rgbToGray(rgba[i], rgba[i + 1], rgba[i + 2]);
  }

  const { low, high } = stretchHistogram(gray);
  const range = high - low;

  if (lightweight) {
    for (let px = 0; px < pixelCount; px++) {
      const i = px * 4;
      let normalized = ((gray[px] - low) / range) * 255;
      let value = (normalized - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;
      value = applySoftBinarization(value, strongBinarization);
      const v = clampByte(value);
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = rgba[i + 3];
    }
    return out;
  }

  const stretched = new Float32Array(pixelCount);
  for (let px = 0; px < pixelCount; px++) {
    stretched[px] = ((gray[px] - low) / range) * 255;
  }

  const blurred = boxBlurGray(stretched, width, height);

  for (let px = 0; px < pixelCount; px++) {
    const i = px * 4;
    const sharpened = stretched[px] + SHARPEN_AMOUNT * (stretched[px] - blurred[px]);
    let value = (sharpened - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;
    value = applySoftBinarization(value, strongBinarization);

    const v = clampByte(value);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = rgba[i + 3];
  }

  return out;
}

export async function applyContrastEnhancement(
  sourceUri: string,
  options: EnhanceReceiptOptions = {},
): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = base64ToUint8Array(base64);
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const pixelCount = decoded.width * decoded.height;

  const enhanced = enhanceReceiptPixels(decoded.data, decoded.width, decoded.height, {
    lightweight: options.lightweight ?? pixelCount > LIGHTWEIGHT_PIXEL_THRESHOLD,
    strongBinarization: options.strongBinarization,
  });

  const encoded = jpeg.encode(
    { data: enhanced, width: decoded.width, height: decoded.height },
    92,
  );

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error('Cache indisponível para optimizar imagem do talão.');
  }

  const suffix = options.strongBinarization ? 'strong' : 'std';
  const outUri = `${cacheDir}receipt-enhanced-${suffix}-${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(outUri, uint8ToBase64(encoded.data), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outUri;
}

/**
 * Pipeline duplo: passagem standard + passagem com binarização forte.
 * Escolhe a versão com maior variância de pixels (texto mais legível).
 */
export async function applyBestContrastEnhancement(sourceUri: string): Promise<string> {
  const standard = await applyContrastEnhancement(sourceUri, { strongBinarization: false });

  try {
    const strong = await applyContrastEnhancement(sourceUri, { strongBinarization: true });
    const standardScore = await estimateTextContrastScore(standard);
    const strongScore = await estimateTextContrastScore(strong);
    return strongScore > standardScore * 1.08 ? strong : standard;
  } catch {
    return standard;
  }
}

async function estimateTextContrastScore(uri: string): Promise<number> {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const data = decoded.data;
  let sum = 0;
  let sumSq = 0;
  const step = 16;

  for (let i = 0; i < data.length; i += 4 * step) {
    const v = data[i];
    sum += v;
    sumSq += v * v;
  }

  const n = data.length / (4 * step);
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return variance;
}
