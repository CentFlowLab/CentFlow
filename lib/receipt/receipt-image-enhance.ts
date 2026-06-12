import * as FileSystem from 'expo-file-system/legacy';
import jpeg from 'jpeg-js';

/** Contraste para texto de talões (1 = sem alteração). */
const CONTRAST_FACTOR = 1.42;
/** Brilho leve após contraste (-255..255). */
const BRIGHTNESS_OFFSET = 8;
/** Limiar para binarização suave (talões térmicos / baixo contraste). */
const SOFT_THRESHOLD = 168;

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

/**
 * Melhora legibilidade OCR: grayscale + contraste + binarização suave.
 * Corre em JS puro (jpeg-js) — funciona em iOS/Android sem módulos nativos extra.
 */
export function enhanceReceiptPixels(
  rgba: Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  const out = new Uint8Array(rgba.length);
  const pixelCount = width * height;

  for (let px = 0; px < pixelCount; px++) {
    const i = px * 4;
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    let value = (gray - 128) * CONTRAST_FACTOR + 128 + BRIGHTNESS_OFFSET;

    // Binarização suave: empurra pixels para preto/branco sem perder anti-aliasing
    if (value < SOFT_THRESHOLD) {
      value = value * 0.55;
    } else {
      value = 255 - (255 - value) * 0.35;
    }

    const v = clampByte(value);
    out[i] = v;
    out[i + 1] = v;
    out[i + 2] = v;
    out[i + 3] = a;
  }

  return out;
}

export async function applyContrastEnhancement(sourceUri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });

  const enhanced = enhanceReceiptPixels(decoded.data, decoded.width, decoded.height);
  const encoded = jpeg.encode(
    { data: enhanced, width: decoded.width, height: decoded.height },
    92,
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
