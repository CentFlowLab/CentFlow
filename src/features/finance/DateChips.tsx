import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { addDays, calendarDateToLocalDate, type CalendarDate } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { CalendarPicker, Chip, ChipGroup, Dialog } from '@/ui/components';

type Props = {
  label: string;
  value: CalendarDate;
  today: CalendarDate;
  onChange: (value: CalendarDate) => void;
  errorText?: string;
};

/** Data com atalhos Hoje / Ontem e um calendário só quando se pede outra data. */
export function DateChips({ label, value, today, onChange, errorText }: Props) {
  const { t } = useTranslation();
  const { formatDate, locale } = useLocaleFormat();
  const [open, setOpen] = useState(false);
  const yesterday = addDays(today, -1);
  const custom = value !== today && value !== yesterday;
  return (
    <>
      <ChipGroup label={label} errorText={errorText}>
        <Chip
          label={t('common.today')}
          selected={value === today}
          onPress={() => onChange(today)}
        />
        <Chip
          label={t('common.yesterday')}
          selected={value === yesterday}
          onPress={() => onChange(yesterday)}
        />
        <Chip
          label={
            custom ? formatDate(calendarDateToLocalDate(value), 'medium') : t('entryForm.pickDate')
          }
          icon="calendar-outline"
          selected={custom}
          onPress={() => setOpen(true)}
        />
      </ChipGroup>
      <Dialog
        visible={open}
        title={t('entryForm.pickDate')}
        onDismiss={() => setOpen(false)}
        actions={[
          { label: t('common.close'), variant: 'secondary', onPress: () => setOpen(false) },
        ]}>
        <CalendarPicker
          value={value}
          today={today}
          locale={locale}
          labels={{
            previousMonth: t('calendar.previousMonth'),
            nextMonth: t('calendar.nextMonth'),
          }}
          onChange={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      </Dialog>
    </>
  );
}
