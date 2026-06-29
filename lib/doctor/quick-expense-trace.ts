import { logAppEvent, setDiagnosticAction } from '@/lib/diagnostics';

export const QUICK_EXPENSE_SOURCE = 'quick_expense';

export type QuickExpenseAction =
  | 'open'
  | 'amount_entered'
  | 'amount_preset'
  | 'repeat_last'
  | 'category_selected'
  | 'save_start'
  | 'save_success'
  | 'save_error';

/** Telemetria do fluxo de despesa rápida — sempre visível no Doctor (dev/beta). */
export function traceQuickExpense(
  action: QuickExpenseAction,
  meta?: Record<string, unknown>,
): void {
  setDiagnosticAction(`quick_expense:${action}`);
  logAppEvent(action === 'save_error' ? 'error' : 'info', QUICK_EXPENSE_SOURCE, action, {
    screen: QUICK_EXPENSE_SOURCE,
    action,
    ...meta,
  });
}
