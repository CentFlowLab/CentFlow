import { useTranslation } from 'react-i18next';

import { deadlineStatus, type CalendarDate } from '@/core/finance';
import { Badge, type BadgeTone } from '@/ui/components';

const TONES: Record<'overdue' | 'soon' | 'ok', BadgeTone> = {
  overdue: 'negative',
  soon: 'warning',
  ok: 'positive',
};

export function DeadlineBadge({ date, today }: { date: CalendarDate | null; today: CalendarDate }) {
  const { t } = useTranslation();
  const status = deadlineStatus(date, today);
  if (status === 'none') return null;
  return <Badge label={t(`deadline.${status}`)} tone={TONES[status]} />;
}
