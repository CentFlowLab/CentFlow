import type { FinancialCalendarProjectionDay } from '@/lib/domain/financial/calendar';
import { formatMoney } from '@/lib/domain/financial/money';
import { fetchUserPreferences } from '@/lib/preferences/preferences.service';
import {
  ensureLocalNotificationPermissions,
  presentImmediateLocalNotification,
} from '@/lib/notifications/local-notifications';
import {
  buildCalendarRiskNotificationMessage,
  loadCalendarRiskNotificationState,
  markCalendarRiskNotified,
} from '@/lib/notifications/calendar-risk-notification.storage';
import { getSupabaseClient, isSupabaseEnabled } from '@/lib/supabase';
import { isMockAuthEnabled } from '@/lib/auth';

async function resolveUserId(): Promise<string | null> {
  if (isMockAuthEnabled()) return 'mock-user-1';
  if (!isSupabaseEnabled()) return null;

  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function riskDaysWithin(days: FinancialCalendarProjectionDay[], withinDays: number): FinancialCalendarProjectionDay[] {
  return days.filter((day) => day.risk === 'risk' && day.dayIndex > 0 && day.dayIndex <= withinDays);
}

/**
 * Notifica dias de risco nos próximos 7 dias — uma vez por data de risco.
 */
export async function checkCalendarRiskNotifications(input: {
  riskDays: FinancialCalendarProjectionDay[];
  withinDays?: number;
}): Promise<void> {
  try {
    const userId = await resolveUserId();
    if (!userId) return;

    const preferences = await fetchUserPreferences(userId);
    if (!preferences.pushNotifications || !preferences.budgetAlerts) return;

    const upcoming = riskDaysWithin(input.riskDays, input.withinDays ?? 7);
    if (upcoming.length === 0) return;

    const state = await loadCalendarRiskNotificationState(userId);
    const pending = upcoming.filter((day) => !state.notifiedRiskDates.includes(day.date));
    if (pending.length === 0) return;

    const granted = await ensureLocalNotificationPermissions();
    if (!granted) return;

    const nextRisk = pending[0];
    const outflowEvents = nextRisk.events.filter((event) => event.direction === 'outflow');

    await presentImmediateLocalNotification(
      'Risco de saldo negativo',
      buildCalendarRiskNotificationMessage({
        riskDate: nextRisk.date,
        balance: nextRisk.projectedBalance,
        eventLabels: outflowEvents.map((event) => `${event.label} (${formatMoney(event.amount)})`),
      }),
    );

    await markCalendarRiskNotified(userId, nextRisk.date);
  } catch {
    // Notificação é efeito secundário.
  }
}
