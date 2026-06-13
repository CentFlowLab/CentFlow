import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { colors } from '@/lib/theme';

export type OcrConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown';

export type OcrConfidenceTone = {
  label: string;
  color: string;
  bg: string;
  level: OcrConfidenceLevel;
};

export type OcrFieldKey = 'merchantName' | 'amount' | 'date' | 'category' | 'items';

export function getOcrConfidenceTone(
  confidence?: number,
  source?: ReceiptOcrResult['source'],
): OcrConfidenceTone {
  if (source === 'demo') {
    return {
      label: 'Demo',
      color: colors.warning,
      bg: colors.accentMuted,
      level: 'low',
    };
  }

  const pct = confidence !== undefined ? Math.round(confidence * 100) : null;
  if (pct === null) {
    return {
      label: 'Sem score',
      color: colors.textMuted,
      bg: colors.surface,
      level: 'unknown',
    };
  }
  if (pct >= 70) {
    return {
      label: `${pct}%`,
      color: colors.success,
      bg: colors.successMuted,
      level: 'high',
    };
  }
  if (pct >= 45) {
    return {
      label: `${pct}%`,
      color: colors.warning,
      bg: colors.accentMuted,
      level: 'medium',
    };
  }
  return {
    label: `${pct}%`,
    color: colors.danger,
    bg: colors.dangerMuted,
    level: 'low',
  };
}

export function getOcrSourceLabel(source?: ReceiptOcrResult['source']): string {
  if (source === 'api') return 'Google Vision';
  if (source === 'device') return 'Leitura no dispositivo';
  if (source === 'demo') return 'Demonstração';
  return 'OCR automático';
}

function fieldHasValue(ocr: ReceiptOcrResult, field: OcrFieldKey): boolean {
  switch (field) {
    case 'merchantName':
      return Boolean(ocr.merchantName?.trim());
    case 'amount':
      return ocr.totalAmount !== undefined && ocr.totalAmount > 0;
    case 'date':
      return Boolean(ocr.date?.trim());
    case 'category':
      return Boolean(ocr.suggestedCategory?.trim());
    case 'items':
      return (ocr.items?.length ?? 0) > 0;
    default:
      return false;
  }
}

/**
 * Confiança por campo — deriva do score global com penalização se o campo está vazio.
 */
export function getOcrFieldConfidence(
  ocr: ReceiptOcrResult | null,
  field: OcrFieldKey,
): OcrConfidenceLevel {
  if (!ocr) return 'unknown';
  if (!fieldHasValue(ocr, field)) return 'unknown';

  const base = ocr.confidence ?? 0.5;
  const tone = getOcrConfidenceTone(base, ocr.source);

  if (field === 'items') {
    const count = ocr.items?.length ?? 0;
    if (count >= 3 && tone.level === 'high') return 'high';
    if (count >= 1) return tone.level === 'low' ? 'medium' : tone.level;
    return 'unknown';
  }

  return tone.level;
}

export function getOcrFieldTone(level: OcrConfidenceLevel): {
  border: string;
  background: string;
  badge: string;
  badgeBg: string;
} {
  switch (level) {
    case 'high':
      return {
        border: colors.success,
        background: colors.successMuted,
        badge: colors.success,
        badgeBg: colors.successMuted,
      };
    case 'medium':
      return {
        border: colors.warning,
        background: colors.accentMuted,
        badge: colors.warning,
        badgeBg: colors.accentMuted,
      };
    case 'low':
      return {
        border: colors.danger,
        background: colors.dangerMuted,
        badge: colors.danger,
        badgeBg: colors.dangerMuted,
      };
    default:
      return {
        border: colors.border,
        background: colors.surface,
        badge: colors.textMuted,
        badgeBg: colors.surfaceHighlight,
      };
  }
}

export const OCR_FIELD_LABELS: Record<OcrFieldKey, string> = {
  merchantName: 'Loja',
  amount: 'Total',
  date: 'Data',
  category: 'Categoria',
  items: 'Itens',
};

export function getDetectedOcrFields(ocr: ReceiptOcrResult): OcrFieldKey[] {
  const fields: OcrFieldKey[] = ['merchantName', 'amount', 'date', 'category', 'items'];
  return fields.filter((field) => fieldHasValue(ocr, field));
}

export function getMissingOcrFields(ocr: ReceiptOcrResult): OcrFieldKey[] {
  const fields: OcrFieldKey[] = ['merchantName', 'amount', 'date', 'category'];
  return fields.filter((field) => !fieldHasValue(ocr, field));
}
