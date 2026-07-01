import { logAppError, logAppEvent } from '@/lib/diagnostics';
import { setDiagnosticAction } from '@/lib/diagnostics/runtime-context';

export const TRANSFER_FLOW_SOURCE = 'account_transfer';

type TransferFlowStep =
  | 'validation_start'
  | 'validation_fail'
  | 'balance_check'
  | 'mutation_start'
  | 'mutation_service_start'
  | 'mutation_service_supabase_insert'
  | 'mutation_success'
  | 'mutation_error'
  | 'mutation_settled'
  | 'cache_invalidate_start'
  | 'cache_invalidate_done'
  | 'ui_refresh';

let currentOperationId: string | null = null;

function beginOperation(): string {
  currentOperationId = `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return currentOperationId;
}

export function traceTransferStep(
  step: TransferFlowStep | string,
  meta?: Record<string, unknown>,
  level: 'info' | 'warn' | 'error' = 'info',
): void {
  if (step === 'validation_start' || step === 'mutation_start') {
    if (!currentOperationId) beginOperation();
  }

  setDiagnosticAction(`account_transfer:${step}`);

  const context = {
    step,
    action: 'account_transfer',
    screen: 'TransferAccountModal',
    operationId: currentOperationId ?? undefined,
    ...meta,
  };

  if (level === 'error') {
    logAppError(TRANSFER_FLOW_SOURCE, new Error(String(meta?.message ?? step)), context);
  } else {
    logAppEvent(level, TRANSFER_FLOW_SOURCE, step, context);
  }

  if (step === 'mutation_settled' || step === 'mutation_error') {
    currentOperationId = null;
  }
}

export function traceTransferError(step: string, error: unknown, meta?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  logAppError(TRANSFER_FLOW_SOURCE, error instanceof Error ? error : new Error(message), {
    step,
    action: 'account_transfer',
    screen: 'TransferAccountModal',
    operationId: currentOperationId ?? undefined,
    ...meta,
  });
  currentOperationId = null;
}
