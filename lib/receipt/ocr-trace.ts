import { traceFinancialMutationStep } from '@/lib/doctor/financial-mutation-trace';

export type OcrFlowStep =
  | 'image_selected'
  | 'upload_start'
  | 'upload_success'
  | 'parse_success'
  | 'parse_failed';

/** Passos Doctor do fluxo OCR (movement_create / ocr_process). */
export function traceOcrStep(
  step: OcrFlowStep,
  meta?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  traceFinancialMutationStep(step, {
    screen: 'movement_create',
    action: 'ocr_process',
    step,
    component: 'ocr',
    ...meta,
  }, level);
}
