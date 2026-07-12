import { useEffect, useRef } from 'react';

import { useFinancialCalendar } from '@/hooks/useFinancialCalendar';
import { useAuth } from '@/lib/auth';
import { checkCalendarRiskNotifications } from '@/lib/notifications/calendar-risk-alert.service';

/** Dispara notificação local quando há risco de saldo negativo nos próximos 7 dias. */
export function CalendarRiskNotificationGate() {
  const { isAuthenticated, user } = useAuth();
  const { calendar } = useFinancialCalendar({ horizonDays: 30 });
  const lastSignature = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || !calendar) return;

    const signature = calendar.riskDays.map((day) => day.date).join(',');
    if (signature === lastSignature.current) return;
    lastSignature.current = signature;

    void checkCalendarRiskNotifications({ riskDays: calendar.riskDays, withinDays: 7 });
  }, [calendar, isAuthenticated, user?.id]);

  return null;
}
