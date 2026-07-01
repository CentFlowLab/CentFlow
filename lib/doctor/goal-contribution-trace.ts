import { logAppError, logAppEvent, type AppLogLevel } from '@/lib/diagnostics';

const SOURCE = 'doctor:goal_contribution';

export function traceGoalContribution(
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
