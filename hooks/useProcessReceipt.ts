import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import {
  processReceiptFlow,
  type ProcessReceiptPhase,
} from '@/lib/api/services/receipt.service';
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
    onSettled: () => setPhase(null),
  });

  return {
    ...mutation,
    phase,
    phaseLabel: getProcessReceiptPhaseLabel(phase),
    data: mutation.data as ProcessedReceipt | undefined,
  };
}
