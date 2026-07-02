import { logAppError, logAppEvent, type AppLogLevel } from '@/lib/diagnostics';

const SOURCE = 'doctor:loan_payment';

export function traceLoanPayment(
  action: string,
  meta?: Record<string, unknown>,
  level: AppLogLevel = 'info',
): void {
  if (level === 'error') {
    logAppError(SOURCE, new Error(action), meta);
    return;
  }
  logAppEvent(level, SOURCE, action, meta);
}

export function traceMonthlyAvailableBreakdown(meta: Record<string, unknown>): void {
  logAppEvent('info', 'doctor:monthly_available', 'monthly_available_breakdown', meta);
}

export function traceGoalWithdrawal(
  action: string,
  meta?: Record<string, unknown>,
  level: AppLogLevel = 'info',
): void {
  if (level === 'error') {
    logAppError('doctor:goal_withdrawal', new Error(action), meta);
    return;
  }
  logAppEvent(level, 'doctor:goal_withdrawal', action, meta);
}
