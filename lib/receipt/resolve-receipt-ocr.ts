import type { ReceiptDraft, ReceiptOcrResult } from '@/lib/domain/receipt.types';
import { isMockOcrDemoEnabled } from '@/lib/auth';
import { traceFinancialMutationError, traceOcrFailure } from '@/lib/doctor/financial-mutation-trace';
import { isSupabaseEnabled, supabaseReceipts } from '@/lib/supabase';
import { getClientOcrUnavailableMessage, runClientOcr } from '@/lib/receipt/client-ocr';
import {
  isAcceptableOcrResult,
  ocrQualityScore,
  sanitizeOcrResult,
} from '@/lib/receipt/ocr-sanitize';

export type ResolveOcrOutcome = {
  result: ReceiptOcrResult | null;
  unavailableReason?: string;
  engine: 'cloud' | 'device' | 'none';
};

/**
 * Motor principal: Google Vision via Supabase Edge Function.
 * Fallback: OCR on-device (expo-ocr-kit) se cloud falhar ou score baixo.
 */
export async function resolveReceiptOcr(
  receiptId: string,
  draft: ReceiptDraft,
  inlineResult?: ReceiptOcrResult | null,
): Promise<ResolveOcrOutcome> {
  if (inlineResult) {
    const sanitized = sanitizeOcrResult(inlineResult);
    return {
      result: sanitized,
      engine: sanitized?.source === 'api' ? 'cloud' : 'device',
    };
  }

  if (isMockOcrDemoEnabled()) {
    return { result: null, engine: 'none' };
  }

  if (isSupabaseEnabled()) {
    let cloud: ReceiptOcrResult | null = null;

    try {
      const raw = await supabaseReceipts.invokeVisionOcr(receiptId);
      cloud = raw ? sanitizeOcrResult({ ...raw, source: 'api' }) : null;
    } catch (error) {
      traceFinancialMutationError(error, {
        screen: 'movement_create',
        action: 'ocr_resolve',
        component: 'resolve-receipt-ocr',
        receiptId,
        engine: 'cloud',
        severity: 'medium',
      });
      cloud = null;
    }

    if (cloud && isAcceptableOcrResult(cloud)) {
      return { result: cloud, engine: 'cloud' };
    }

    const client = await runClientOcr(draft);
    const device = client.result ? sanitizeOcrResult(client.result) : null;

    if (device && ocrQualityScore(device) >= ocrQualityScore(cloud)) {
      return {
        result: device,
        engine: 'device',
        unavailableReason: cloud
          ? undefined
          : getClientOcrUnavailableMessage(client.unavailableReason),
      };
    }

    if (cloud) {
      return { result: cloud, engine: 'cloud' };
    }

    const unavailableReason = getClientOcrUnavailableMessage(client.unavailableReason);
    traceOcrFailure(unavailableReason ?? 'ocr_no_result', {
      screen: 'movement_create',
      component: 'resolve-receipt-ocr',
      receiptId,
      engine: device ? 'device' : 'none',
      cloudAttempted: true,
      deviceAttempted: true,
    });

    return {
      result: device,
      engine: device ? 'device' : 'none',
      unavailableReason,
    };
  }

  const client = await runClientOcr(draft);
  const device = client.result ? sanitizeOcrResult(client.result) : null;

  return {
    result: device,
    engine: device ? 'device' : 'none',
    unavailableReason: device
      ? undefined
      : getClientOcrUnavailableMessage(client.unavailableReason),
  };
}
