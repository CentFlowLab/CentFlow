import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addMonths,
  calendarDateToLocalDate,
  monthKeyToLocalDate,
  monthOf,
  monthRange,
  type CalendarDate,
  type MonthKey,
} from '@/core/finance';

import { layout, radius, spacing, useTheme } from '../theme';
import { Icon } from './Icon';
import { IconButton } from './IconButton';
import { MonthYearPicker, type MonthYearPickerLabels } from './MonthYearPicker';
import { Text } from './Text';

type Props = {
  value: CalendarDate;
  onChange: (value: CalendarDate) => void;
  locale: string;
  today: CalendarDate;
  /**
   * Com `monthPicker`, tocar no mês abre a escolha de mês e ano (o mesmo seletor das barras de
   * mês): datas distantes ficam a poucos toques.
   */
  labels: {
    previousMonth: string;
    nextMonth: string;
    monthPicker?: MonthYearPickerLabels & { open: string };
  };
};

function firstDayOfWeek(locale: string): number {
  return locale === 'en-US' ? 0 : 1;
}

function buildWeeks(month: MonthKey, weekStart: number): (CalendarDate | null)[][] {
  const { end } = monthRange(month);
  const daysInMonth = Number(end.slice(8));
  const leading = (monthKeyToLocalDate(month).getDay() - weekStart + 7) % 7;
  const cells: (CalendarDate | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7));
}

/** Calendário mensal simples, sem dependências nativas (funciona igual em iOS, Android e web). */
export function CalendarPicker({ value, onChange, locale, today, labels }: Props) {
  const { colors } = useTheme();
  const [visibleMonth, setVisibleMonth] = useState<MonthKey>(monthOf(value));
  // Data mudada de fora (ex.: escrita à mão): mostra o mês dessa data.
  const [shownValue, setShownValue] = useState(value);
  if (shownValue !== value) {
    setShownValue(value);
    setVisibleMonth(monthOf(value));
  }
  const weekStart = firstDayOfWeek(locale);

  const weekdayNames = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    // 2024-01-07 foi domingo.
    return Array.from({ length: 7 }, (_, index) =>
      formatter.format(new Date(2024, 0, 7 + ((index + weekStart) % 7))),
    );
  }, [locale, weekStart]);

  const dayFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }),
    [locale],
  );
  const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
    monthKeyToLocalDate(visibleMonth),
  );
  const shownTitle = title.charAt(0).toLocaleUpperCase(locale) + title.slice(1);
  const [picking, setPicking] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={labels.previousMonth}
          onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
        />
        {labels.monthPicker ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={labels.monthPicker.open.replace('{{month}}', shownTitle)}
            onPress={() => setPicking(true)}
            style={({ pressed }) => [
              styles.titleButton,
              pressed && { backgroundColor: colors.surfaceMuted },
            ]}>
            <Text variant="bodyStrong" accessibilityLiveRegion="polite">
              {shownTitle}
            </Text>
            <Icon name="chevron-down" size={16} color="textSecondary" />
          </Pressable>
        ) : (
          <Text variant="bodyStrong" accessibilityLiveRegion="polite" style={styles.title}>
            {shownTitle}
          </Text>
        )}
        <IconButton
          icon="chevron-forward"
          accessibilityLabel={labels.nextMonth}
          onPress={() => setVisibleMonth((month) => addMonths(month, 1))}
        />
      </View>
      <View style={styles.row}>
        {weekdayNames.map((name, index) => (
          <Text key={index} variant="caption" tone="tertiary" align="center" style={styles.cell}>
            {name}
          </Text>
        ))}
      </View>
      {buildWeeks(visibleMonth, weekStart).map((week, weekIndex) => (
        <View key={weekIndex} style={styles.row}>
          {week.map((date, dayIndex) => {
            if (!date) return <View key={dayIndex} style={styles.cell} />;
            const selected = date === value;
            const isToday = date === today;
            return (
              <Pressable
                key={date}
                accessibilityRole="button"
                accessibilityLabel={dayFormatter.format(calendarDateToLocalDate(date))}
                accessibilityState={{ selected }}
                onPress={() => onChange(date)}
                style={({ pressed }) => [
                  styles.cell,
                  styles.day,
                  {
                    backgroundColor: selected
                      ? colors.primary
                      : pressed
                        ? colors.surfaceMuted
                        : 'transparent',
                    borderColor: isToday && !selected ? colors.primary : 'transparent',
                  },
                ]}>
                <Text
                  variant="label"
                  tabular
                  style={{ color: selected ? colors.onPrimary : colors.text }}>
                  {Number(date.slice(8))}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
      {labels.monthPicker ? (
        <MonthYearPicker
          visible={picking}
          value={visibleMonth}
          currentMonth={monthOf(today)}
          locale={locale}
          labels={labels.monthPicker}
          onChange={setVisibleMonth}
          onDismiss={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  titleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  day: {
    borderRadius: radius.full,
    borderWidth: 1.5,
    margin: 1,
  },
});
