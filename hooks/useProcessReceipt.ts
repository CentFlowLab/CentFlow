import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import {
  processReceiptFlow,
  type ProcessReceiptPhase,
} from '@/lib/api/services/receipt.service';
import { logDoctorMutationFailure, traceOcrFailure } from '@/lib/doctor';
import { DEFAULT_OCR_FAILED_MESSAGE } from '@/lib/receipt/ocr-messages';
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
    mutationFn: async (draft: ReceiptDraft) => {
      try {
        return await processReceiptFlow(draft, { onPhase: setPhase });
      } catch (error) {
        try {
          logDoctorMutationFailure(error, {
            action: 'ocr_process',
            screen: 'movement_create',
            severity: 'high',
            payload: {
              hasImage: true,
              imageUriPresent: Boolean(draft.localUri),
              source: 'processReceiptFlow',
            },
          });
        } catch {
          // Doctor must never crash OCR
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      if (!data.ocrResult) {
        try {
          traceOcrFailure(data.ocrUnavailableReason ?? DEFAULT_OCR_FAILED_MESSAGE, {
            screen: 'movement_create',
            action: 'ocr_process',
            component: 'useProcessReceipt',
            receiptId: data.receiptId || undefined,
          });
        } catch {
          // ignore
        }
      }
    },
    onError: (error, draft) => {
      try {
        logDoctorMutationFailure(error, {
          action: 'ocr_process',
          screen: 'movement_create',
          severity: 'high',
          payload: {
            hasImage: true,
            imageUriPresent: Boolean(draft.localUri),
            source: 'useProcessReceipt',
          },
        });
      } catch {
        // ignore
      }
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
