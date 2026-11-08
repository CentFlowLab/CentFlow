import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { toCalendarDate, type CalendarDate } from '@/core/finance';

/** Data local de hoje; atualiza quando a app volta ao primeiro plano (ex.: após a meia-noite). */
export function useToday(): CalendarDate {
  const [today, setToday] = useState(() => toCalendarDate(new Date()));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toCalendarDate(new Date()));
    });
    return () => subscription.remove();
  }, []);

  return today;
}
