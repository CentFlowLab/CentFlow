import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { daysUntil, deadlineStatus, type CalendarDate } from '@/core/finance';
import { Badge, type BadgeTone } from '@/ui/components';

const TONES: Record<'overdue' | 'soon' | 'ok', BadgeTone> = {
  overdue: 'negative',
  soon: 'warning',
  ok: 'positive',
};

/** "Expira em 12 dias", "Expira hoje", "Expirou há 3 dias", com a cor do estado. */
export function deadlineLabel(t: TFunction, days: number): string {
  if (days === 0) return t('deadlineDays.today');
  return days > 0 ? t('deadlineDays.in', { count: days }) : t('deadlineDays.ago', { count: -days });
}

export function DeadlineBadge({ date, today }: { date: CalendarDate | null; today: CalendarDate }) {
  const { t } = useTranslation();
  const status = deadlineStatus(date, today);
  const days = daysUntil(date, today);
  if (status === 'none' || days === null) return null;
  return <Badge label={deadlineLabel(t, days)} tone={TONES[status]} />;
}

export const DEADLINE_TONES = TONES;
