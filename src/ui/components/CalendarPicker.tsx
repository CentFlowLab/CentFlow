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

import { radius, spacing, useTheme } from '../theme';
import { IconButton } from './IconButton';
import { Text } from './Text';

type Props = {
  value: CalendarDate;
  onChange: (value: CalendarDate) => void;
  locale: string;
  today: CalendarDate;
  labels: { previousMonth: string; nextMonth: string };
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="chevron-back"
          accessibilityLabel={labels.previousMonth}
          onPress={() => setVisibleMonth((month) => addMonths(month, -1))}
        />
        <Text variant="bodyStrong" accessibilityLiveRegion="polite" style={styles.title}>
          {title.charAt(0).toLocaleUpperCase(locale) + title.slice(1)}
        </Text>
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
