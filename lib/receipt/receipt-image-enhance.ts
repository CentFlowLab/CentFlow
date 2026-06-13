import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

/** Contraste para texto de talões (1 = sem alteração). */
const CONTRAST_FACTOR = 1.52;
/** Brilho leve após contraste (-255..255). */
const BRIGHTNESS_OFFSET = 6;
/** Limiar para binarização suave (talões térmicos / baixo contraste). */
const SOFT_THRESHOLD = 165;
/** Intensidade do unsharp mask (nitidez). */
const SHARPEN_AMOUNT = 0.55;
/** Acima disto usa enhancement leve (sem blur) para evitar OOM no telemóvel */
const LIGHTWEIGHT_PIXEL_THRESHOLD = 900_000;

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

function applySoftBinarization(value: number): number {
  if (value < SOFT_THRESHOLD) {
    return value * 0.5;
  }
  return 255 - (255 - value) * 0.32;
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

type EnhanceOptions = {
  lightweight?: boolean;
};

/**
 * Melhora legibilidade OCR: grayscale + contraste + (opcional) nitidez + binarização suave.
 */
export function enhanceReceiptPixels(
  rgba: Uint8Array,
  width: number,
  height: number,
  options: EnhanceOptions = {},
): Uint8Array {
  const pixelCount = width * height;
  const out = new Uint8Array(rgba.length);
  const lightweight = options.lightweight ?? pixelCount > LIGHTWEIGHT_PIXEL_THRESHOLD;

  if (lightweight) {
    for (let px = 0; px < pixelCount; px++) {
      const i = px * 4;
      const gray = rgbToGray(rgba[i], rgba[i + 1], rgba[i + 2]);
      let value = (gray - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;
      value = applySoftBinarization(value);
      const v = clampByte(value);
      out[i] = v;
      out[i + 1] = v;
      out[i + 2] = v;
      out[i + 3] = rgba[i + 3];
    }
    return out;
  }

  const gray = new Float32Array(pixelCount);

  for (let px = 0; px < pixelCount; px++) {
    const i = px * 4;
    gray[px] = rgbToGray(rgba[i], rgba[i + 1], rgba[i + 2]);
  }

  const blurred = boxBlurGray(gray, width, height);

  for (let px = 0; px < pixelCount; px++) {
    const i = px * 4;
    const sharpened = gray[px] + SHARPEN_AMOUNT * (gray[px] - blurred[px]);
    let value = (sharpened - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;
    value = applySoftBinarization(value);

    const v = clampByte(value);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = rgba[i + 3];
  }

  return out;
}

export async function applyContrastEnhancement(sourceUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = base64ToUint8Array(base64);
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

  const enhanced = enhanceReceiptPixels(decoded.data, decoded.width, decoded.height, {
    lightweight: decoded.width * decoded.height > LIGHTWEIGHT_PIXEL_THRESHOLD,
  });

  const encoded = jpeg.encode(
    { data: enhanced, width: decoded.width, height: decoded.height },
    90,
  );

  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error('Cache indisponível para optimizar imagem do talão.');
  }

  const outUri = `${cacheDir}receipt-enhanced-${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(outUri, uint8ToBase64(encoded.data), {
    encoding: FileSystem.EncodingType.Base64,
  });

  return outUri;
}
