import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import type { ReceiptDraft } from '@/lib/domain/receipt.types';

import { applyContrastEnhancement } from './receipt-image-enhance';
import { getExifRotationDegrees } from './receipt-exif';

/**
 * Pipeline de pré-processamento mobile para OCR de talões (v4).
 *
 * Passos:
 *  1. Preservar cópia da foto original (para anexo ao movimento)
 *  2. Correcção de rotação (EXIF Orientation)
 *  3. Resize — largura máx. 1400px (sweet spot cloud OCR)
 *  4. Grayscale + contraste + nitidez + binarização suave (jpeg-js)
 *  5. Compressão JPEG inteligente (qualidade alta, reduz só se ficheiro > 1.8MB)
 *
 * Deskew pesado deve correr no backend — ver backend-reference/ e OCR_PIPELINE.md.
 */
export const RECEIPT_PREPROCESS_VERSION = '4';

/** Largura máxima enviada ao OCR (1200–1500px) */
const OCR_MAX_WIDTH = 1400;
/** Upscale se a foto for demasiado pequena para ler texto */
const OCR_MIN_WIDTH = 1000;
const MAX_FILE_BYTES = 1_800_000;
const JPEG_QUALITIES = [0.92, 0.86, 0.8] as const;

export type PreprocessReceiptOptions = {
  originalWidth?: number;
  originalHeight?: number;
  fileName?: string;
  exif?: Record<string, unknown> | null;
};

function resolveTargetWidth(width?: number): number | undefined {
  if (!width || width <= 0) return OCR_MAX_WIDTH;
  if (width > OCR_MAX_WIDTH) return OCR_MAX_WIDTH;
  if (width < OCR_MIN_WIDTH) return OCR_MAX_WIDTH;
  return undefined;
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
}

async function preserveOriginalCopy(uri: string, fileName?: string): Promise<string> {
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) return uri;

  const baseName = fileName?.replace(/\.[^.]+$/, '') ?? 'receipt';
  const dest = `${cacheDir}${baseName}-original-${Date.now()}.jpg`;

  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

async function saveWithSmartCompression(
  uri: string,
  width: number,
  height: number,
): Promise<{ uri: string; width: number; height: number }> {
  for (const quality of JPEG_QUALITIES) {
    const saved = await ImageManipulator.manipulateAsync(uri, [], {
      compress: quality,
      format: ImageManipulator.SaveFormat.JPEG,
    });

    const size = await getFileSize(saved.uri);
    if (size <= MAX_FILE_BYTES || quality === JPEG_QUALITIES[JPEG_QUALITIES.length - 1]) {
      return saved;
    }
  }

  return { uri, width, height };
}

export async function preprocessReceiptImage(
  uri: string,
  options: PreprocessReceiptOptions = {},
): Promise<ReceiptDraft> {
  const { originalWidth, originalHeight, fileName, exif } = options;
  const originalLocalUri = await preserveOriginalCopy(uri, fileName);
  const actions: ImageManipulator.Action[] = [];

  const rotation = getExifRotationDegrees(exif);
  if (rotation !== 0) {
    actions.push({ rotate: rotation });
  }

  const targetWidth = resolveTargetWidth(originalWidth);
  if (targetWidth) {
    actions.push({ resize: { width: targetWidth } });
  }

  const resized = await ImageManipulator.manipulateAsync(
    uri,
    actions.length > 0 ? actions : [{ resize: { width: OCR_MAX_WIDTH } }],
    {
      compress: 0.96,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  const enhancedUri = await applyContrastEnhancement(resized.uri);
  const final = await saveWithSmartCompression(
    enhancedUri,
    resized.width,
    resized.height,
  );

  const baseName = fileName?.replace(/\.[^.]+$/, '') ?? 'receipt';

  return {
    localUri: final.uri,
    originalLocalUri,
    mimeType: 'image/jpeg',
    fileName: `${baseName}-ocr.jpg`,
    width: final.width,
    height: final.height,
    preprocessed: true,
    preprocessVersion: RECEIPT_PREPROCESS_VERSION,
    originalDimensions:
      originalWidth && originalHeight
        ? { width: originalWidth, height: originalHeight }
        : undefined,
  };
}

/** URI preferida para preview do utilizador (foto original, não a versão OCR). */
export function getReceiptDisplayUri(draft: ReceiptDraft): string {
  return draft.originalLocalUri ?? draft.localUri;
}
