import { logAppError, logAppEvent, type AppLogLevel } from '@/lib/diagnostics';

const SOURCE = 'doctor:recurring_payment';

export function traceRecurringPayment(
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

export function traceHomeAvailableCardRender(meta: Record<string, unknown>): void {
  logAppEvent('info', 'doctor:home_available', 'home_available_card_render', meta);
}

export function traceLoanModalOpened(
  action: 'loan_monthly_payment_opened' | 'loan_extra_payment_opened',
  meta?: Record<string, unknown>,
): void {
  logAppEvent('info', 'doctor:loan_payment', action, meta);
}
