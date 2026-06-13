import type { ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { colors } from '@/lib/theme';

export type OcrConfidenceTone = {
  label: string;
  color: string;
  bg: string;
  level: 'high' | 'medium' | 'low' | 'unknown';
};

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
