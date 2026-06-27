import { logAppEvent, setDiagnosticAction } from '@/lib/diagnostics';

export const QUICK_EXPENSE_LINK_SOURCE = 'quick_expense_link';

export type QuickExpenseLinkAction =
  | 'link_received'
  | 'parse_success'
  | 'parse_failed'
  | 'save_start'
  | 'save_success'
  | 'save_error';

/** Telemetria do deep link de despesa rápida — visível no Doctor (dev/beta). */
export function traceQuickExpenseLink(
  action: QuickExpenseLinkAction,
  meta?: Record<string, unknown>,
): void {
  setDiagnosticAction(`${QUICK_EXPENSE_LINK_SOURCE}:${action}`);
  const level = action === 'parse_failed' || action === 'save_error' ? 'error' : 'info';
  logAppEvent(level, QUICK_EXPENSE_LINK_SOURCE, action, {
    screen: QUICK_EXPENSE_LINK_SOURCE,
    action,
    ...meta,
  });
}
