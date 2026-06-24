import { logAppError, logAppEvent } from '@/lib/diagnostics/app-log';
import type { AppLogSeverity } from '@/lib/diagnostics/app-log';
import { setDiagnosticAction } from '@/lib/diagnostics/runtime-context';

export const FINANCIAL_MUTATION_SOURCE = 'financial_mutation';
export const OCR_FLOW_SOURCE = 'ocr_flow';

export type FinancialMutationAction =
  | 'movement_create'
  | 'movement_update'
  | 'movement_delete'
  | 'credit_create'
  | 'credit_update'
  | 'credit_delete'
  | 'subscription_create'
  | 'subscription_update'
  | 'subscription_delete'
  | 'goal_create'
  | 'goal_update'
  | 'goal_delete'
  | 'warranty_create'
  | 'warranty_update'
  | 'warranty_delete'
  | 'ocr_process'
  | 'ocr_resolve'
  | 'ocr_upload';

export type FinancialTraceContext = {
  screen: string;
  action: FinancialMutationAction | string;
  severity?: AppLogSeverity;
  component?: string;
  payload?: Record<string, unknown>;
  [key: string]: unknown;
};

function resolveSource(action: string): string {
  return action.startsWith('ocr') ? OCR_FLOW_SOURCE : FINANCIAL_MUTATION_SOURCE;
}

/** Doctor tracing must never crash user flows. */
function safeDiagnosticCall(fn: () => void): void {
  try {
    fn();
  } catch {
    // ignore — tracing is best-effort only
  }
}

function sanitizeOcrTraceContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (/token|password|secret|authorization|base64|image/i.test(key)) continue;
    if (typeof value === 'string' && value.length > 200) {
      safe[key] = `${value.slice(0, 200)}…`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

/** Passo estruturado em mutações financeiras — visível no Doctor. */
export function traceFinancialMutationStep(
  message: string,
  context: FinancialTraceContext,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  safeDiagnosticCall(() => {
    setDiagnosticAction(context.action);

    const merged = sanitizeOcrTraceContext({
      ...context,
      severity: context.severity ?? (level === 'warn' ? 'medium' : 'low'),
    });

    if (level === 'error') {
      logAppError(resolveSource(context.action), new Error(message), merged);
    } else {
      logAppEvent(level, resolveSource(context.action), message, merged);
    }
  });
}

/** Erro em mutação financeira — stack + contexto no Doctor. */
export function traceFinancialMutationError(
  error: unknown,
  context: FinancialTraceContext,
): void {
  safeDiagnosticCall(() => {
    setDiagnosticAction(context.action);
    logAppError(
      resolveSource(context.action),
      error instanceof Error ? error : new Error(String(error)),
      sanitizeOcrTraceContext({
        ...context,
        severity: context.severity ?? 'high',
        errorName: error instanceof Error ? error.name : 'unknown',
        errorMessage: error instanceof Error ? error.message : String(error),
      }),
    );
  });
}

export type OcrFlowStep =
  | 'image_selected'
  | 'ocr_start'
  | 'upload_start'
  | 'upload_success'
  | 'parse_start'
  | 'parse_success'
  | 'parse_failed'
  | 'ocr_error';

/** Passo estruturado no fluxo OCR — visível no Doctor. */
export function traceOcrStep(
  step: OcrFlowStep,
  context: {
    screen?: string;
    action?: FinancialMutationAction;
    severity?: AppLogSeverity;
    component?: string;
    payload?: Record<string, unknown>;
    receiptId?: string;
    engine?: string;
  },
): void {
  traceFinancialMutationStep(step, {
    ...context,
    action: context.action ?? 'ocr_process',
    screen: context.screen ?? 'movement_create',
  });
}

/** OCR sem resultado útil — nunca silencioso. */
export function traceOcrFailure(
  reason: string,
  context: Omit<FinancialTraceContext, 'action'> & { action?: FinancialMutationAction },
): void {
  safeDiagnosticCall(() => {
    setDiagnosticAction(context.action ?? 'ocr_process');
    logAppEvent(
      'warn',
      OCR_FLOW_SOURCE,
      reason,
      sanitizeOcrTraceContext({
        screen: context.screen ?? 'movement_create',
        action: context.action ?? 'ocr_process',
        severity: context.severity ?? 'medium',
        component: context.component ?? 'receipt.service',
        ...context,
      }),
    );
  });
}
