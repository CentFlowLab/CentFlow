import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

import type { ReceiptDraft } from '@/lib/domain/receipt.types';

import { applyBestContrastEnhancement } from './receipt-image-enhance';
import { getExifRotationDegrees } from './receipt-exif';

/**
 * Pipeline de pré-processamento mobile para OCR de talões (v5).
 *
 * v5: largura ideal 1280px, histogram stretch, contraste/nitidez agressivos,
 * passagem dupla (standard vs binarização forte), EXIF + grayscale.
 */
export const RECEIPT_PREPROCESS_VERSION = '5';

const OCR_IDEAL_WIDTH = 1280;
const OCR_MAX_WIDTH = 1400;
const OCR_MIN_WIDTH = 1200;
const MAX_FILE_BYTES = 1_800_000;
const JPEG_QUALITIES = [0.92, 0.86, 0.8] as const;

export type PreprocessReceiptOptions = {
  originalWidth?: number;
  originalHeight?: number;
  fileName?: string;
  mimeType?: string;
  exif?: Record<string, unknown> | null;
};

export function isPdfReceipt(mimeType?: string, fileName?: string): boolean {
  if (mimeType === 'application/pdf') return true;
  return Boolean(fileName?.toLowerCase().endsWith('.pdf'));
}

/**
 * Largura alvo para OCR — zona ideal 1200–1400px.
 * Imagens pequenas são ampliadas; grandes são reduzidas.
 */
function resolveTargetWidth(width?: number): number {
  if (!width || width <= 0) return OCR_IDEAL_WIDTH;
  if (width > OCR_MAX_WIDTH) return OCR_IDEAL_WIDTH;
  if (width < OCR_MIN_WIDTH) return OCR_IDEAL_WIDTH;
  if (width >= OCR_MIN_WIDTH && width <= OCR_MAX_WIDTH) return width;
  return OCR_IDEAL_WIDTH;
}

async function getFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;
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

function buildImageDraft(
  localUri: string,
  originalLocalUri: string,
  fileName: string,
  width: number,
  height: number,
  preprocessed: boolean,
  preprocessVersion?: string,
  originalDimensions?: { width: number; height: number },
): ReceiptDraft {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'receipt';

  return {
    localUri,
    originalLocalUri,
    mimeType: 'image/jpeg',
    fileName: `${baseName}-ocr.jpg`,
    width,
    height,
    preprocessed,
    preprocessVersion,
    originalDimensions,
  };
}

/** PDF — sem pré-processamento de imagem; upload directo. */
export async function preparePdfReceiptDraft(
  uri: string,
  fileName: string,
): Promise<ReceiptDraft> {
  const safeName = fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  return {
    localUri: uri,
    originalLocalUri: uri,
    mimeType: 'application/pdf',
    fileName: safeName,
    preprocessed: false,
  };
}

async function normalizeToJpeg(
  uri: string,
  actions: ImageManipulator.Action[],
): Promise<ImageManipulator.ImageResult> {
  return ImageManipulator.manipulateAsync(
    uri,
    actions.length > 0 ? actions : [],
    {
      compress: 0.94,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
}

async function preprocessWithManipulatorOnly(
  uri: string,
  options: PreprocessReceiptOptions,
): Promise<ReceiptDraft> {
  const { originalWidth, originalHeight, fileName, exif } = options;
  const rotation = getExifRotationDegrees(exif);
  const rotateActions: ImageManipulator.Action[] =
    rotation !== 0 ? [{ rotate: rotation }] : [];

  const normalized = await normalizeToJpeg(uri, rotateActions);
  const targetWidth = resolveTargetWidth(originalWidth ?? normalized.width);

  const resized = await ImageManipulator.manipulateAsync(
    normalized.uri,
    [{ resize: { width: targetWidth } }],
    { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG },
  );

  const final = await saveWithSmartCompression(
    resized.uri,
    resized.width,
    resized.height,
  );

  return buildImageDraft(
    final.uri,
    normalized.uri,
    fileName ?? 'receipt',
    final.width,
    final.height,
    true,
    `${RECEIPT_PREPROCESS_VERSION}-lite`,
    originalWidth && originalHeight
      ? { width: originalWidth, height: originalHeight }
      : { width: normalized.width, height: normalized.height },
  );
}

export async function preprocessReceiptImage(
  uri: string,
  options: PreprocessReceiptOptions = {},
): Promise<ReceiptDraft> {
  const { originalWidth, originalHeight, fileName, mimeType, exif } = options;

  if (isPdfReceipt(mimeType, fileName)) {
    return preparePdfReceiptDraft(uri, fileName ?? `receipt-${Date.now()}.pdf`);
  }

  try {
    const rotation = getExifRotationDegrees(exif);
    const rotateActions: ImageManipulator.Action[] =
      rotation !== 0 ? [{ rotate: rotation }] : [];

    const normalized = await normalizeToJpeg(uri, rotateActions);
    const targetWidth = resolveTargetWidth(originalWidth ?? normalized.width);

    const resized = await ImageManipulator.manipulateAsync(
      normalized.uri,
      [{ resize: { width: targetWidth } }],
      { compress: 0.96, format: ImageManipulator.SaveFormat.JPEG },
    );

    let ocrUri = resized.uri;
    let preprocessVersion: string = RECEIPT_PREPROCESS_VERSION;

    try {
      ocrUri = await applyBestContrastEnhancement(resized.uri);
    } catch {
      ocrUri = resized.uri;
      preprocessVersion = `${RECEIPT_PREPROCESS_VERSION}-lite`;
    }

    const final = await saveWithSmartCompression(
      ocrUri,
      resized.width,
      resized.height,
    );

    return buildImageDraft(
      final.uri,
      normalized.uri,
      fileName ?? 'receipt',
      final.width,
      final.height,
      true,
      preprocessVersion,
      originalWidth && originalHeight
        ? { width: originalWidth, height: originalHeight }
        : { width: normalized.width, height: normalized.height },
    );
  } catch {
    return preprocessWithManipulatorOnly(uri, options);
  }
}

/** URI preferida para preview do utilizador (foto original, não a versão OCR). */
export function getReceiptDisplayUri(draft: ReceiptDraft): string {
  return draft.originalLocalUri ?? draft.localUri;
}
