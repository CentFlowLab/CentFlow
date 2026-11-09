import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type CalendarDate } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { Button, CalendarPicker, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

type Props = {
  label: string;
  value: CalendarDate | null;
  today: CalendarDate;
  errorText?: string;
  onChange: (value: CalendarDate | null) => void;
};

/** Data opcional: começa sem data e só mostra o calendário depois de "Definir data". */
export function OptionalDateField({ label, value, today, errorText, onChange }: Props) {
  const { t } = useTranslation();
  const { formatDate, locale } = useLocaleFormat();
  return (
    <View style={styles.field}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      {value === null ? (
        <Button label={t('optionalDate.set')} variant="secondary" onPress={() => onChange(today)} />
      ) : (
        <>
          <Text variant="label">{formatDate(calendarDateToLocalDate(value), 'medium')}</Text>
          <CalendarPicker
            value={value}
            today={today}
            locale={locale}
            labels={{
              previousMonth: t('calendar.previousMonth'),
              nextMonth: t('calendar.nextMonth'),
            }}
            onChange={onChange}
          />
          <Button label={t('optionalDate.clear')} variant="ghost" onPress={() => onChange(null)} />
        </>
      )}
      {errorText ? (
        <Text variant="footnote" tone="negative">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({ field: { gap: spacing.sm } });
