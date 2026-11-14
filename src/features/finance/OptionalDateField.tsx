import type { CalendarDate } from '@/core/finance';

import { DateField } from './DateField';

/** Data opcional (pode ficar vazia): o mesmo campo de data de toda a app (ADR-074). */
export function OptionalDateField(props: {
  label: string;
  value: CalendarDate | null;
  today: CalendarDate;
  errorText?: string;
  onChange: (value: CalendarDate | null) => void;
}) {
  return <DateField {...props} optional />;
}
