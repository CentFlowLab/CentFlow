import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import {
  processReceiptFlow,
  type ProcessReceiptPhase,
} from '@/lib/api/services/receipt.service';
import { logDoctorMutationFailure, traceOcrFailure } from '@/lib/doctor';
import { DEFAULT_OCR_UNAVAILABLE_MESSAGE } from '@/lib/receipt/ocr-messages';
import type { ProcessedReceipt, ReceiptDraft } from '@/lib/domain/receipt.types';

const PHASE_LABELS: Record<ProcessReceiptPhase, string> = {
  uploading_receipt: 'A enviar talão...',
  processing_ocr: 'A processar OCR...',
};

export function getProcessReceiptPhaseLabel(phase: ProcessReceiptPhase | null): string | null {
  if (!phase) return null;
  return PHASE_LABELS[phase];
}

export function useProcessReceipt() {
  const [phase, setPhase] = useState<ProcessReceiptPhase | null>(null);

  const mutation = useMutation({
    mutationFn: (draft: ReceiptDraft) =>
      processReceiptFlow(draft, { onPhase: setPhase }),
    onSuccess: (data) => {
      if (!data.ocrResult) {
        traceOcrFailure(data.ocrUnavailableReason ?? DEFAULT_OCR_UNAVAILABLE_MESSAGE, {
          screen: 'movement_create',
          action: 'ocr_process',
          component: 'useProcessReceipt',
          receiptId: data.receiptId,
        });
      }
    },
    onError: (error, draft) => {
      logDoctorMutationFailure(error, {
        action: 'ocr_process',
        screen: 'movement_create',
        severity: 'high',
        payload: { localUri: draft.localUri?.slice(-32) },
      });
    },
    onSettled: () => setPhase(null),
  });

  return {
    ...mutation,
    phase,
    phaseLabel: getProcessReceiptPhaseLabel(phase),
    data: mutation.data as ProcessedReceipt | undefined,
  };
}
