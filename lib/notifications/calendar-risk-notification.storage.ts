import { readUserJson, writeUserJson } from '@/lib/storage/local-flags';

const STORAGE_SCOPE = 'calendar-risk-notifications';

export type CalendarRiskNotificationState = {
  notifiedRiskDates: string[];
};

export async function loadCalendarRiskNotificationState(
  userId: string,
): Promise<CalendarRiskNotificationState> {
  const stored = await readUserJson<CalendarRiskNotificationState>(STORAGE_SCOPE, userId);
  return stored ?? { notifiedRiskDates: [] };
}

export async function markCalendarRiskNotified(
  userId: string,
  riskDate: string,
): Promise<CalendarRiskNotificationState> {
  const current = await loadCalendarRiskNotificationState(userId);
  if (current.notifiedRiskDates.includes(riskDate)) return current;

  const next = {
    notifiedRiskDates: [...current.notifiedRiskDates, riskDate].slice(-60),
  };
  await writeUserJson(STORAGE_SCOPE, userId, next);
  return next;
}

export function buildCalendarRiskNotificationMessage(input: {
  riskDate: string;
  balance: number;
  eventLabels: string[];
}): string {
  const events =
    input.eventLabels.length > 0
      ? input.eventLabels.slice(0, 3).join(', ')
      : 'vários pagamentos agendados';
  return `A ${input.riskDate.slice(8, 10)}/${input.riskDate.slice(5, 7)} o saldo projetado fica negativo (${input.balance.toFixed(0)} €). Causas: ${events}.`;
}
