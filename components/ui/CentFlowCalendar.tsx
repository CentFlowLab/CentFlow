import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  getWeekdayLabels,
  isDateDisabled,
  isSameDay,
  startOfDay,
} from '@/lib/utils/calendar';

import { Text } from './Text';

type CentFlowCalendarProps = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function CentFlowCalendar({
  value,
  onChange,
  minimumDate,
  maximumDate,
}: CentFlowCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(value));

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  const today = useMemo(() => startOfDay(new Date()), []);
  const weekdays = getWeekdayLabels();

  function goToPreviousMonth() {
    setVisibleMonth((current) => addMonths(current, -1));
  }

  function goToNextMonth() {
    setVisibleMonth((current) => addMonths(current, 1));
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable
          onPress={goToPreviousMonth}
          accessibilityRole="button"
          accessibilityLabel="Mês anterior"
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            tintColor={colors.textSecondary}
            size={20}
          />
        </Pressable>

        <Text variant="body" style={styles.monthLabel}>
          {formatMonthYear(visibleMonth)}
        </Text>

        <Pressable
          onPress={goToNextMonth}
          accessibilityRole="button"
          accessibilityLabel="Mês seguinte"
          style={({ pressed }) => [styles.navButton, pressed && styles.navButtonPressed]}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            tintColor={colors.textSecondary}
            size={20}
          />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {weekdays.map((label) => (
          <Text key={label} variant="caption" color="textMuted" style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {monthGrid.map((cell) => {
          const selected = isSameDay(cell.date, value);
          const isToday = isSameDay(cell.date, today);
          const disabled = isDateDisabled(cell.date, minimumDate, maximumDate);

          return (
            <Pressable
              key={cell.date.toISOString()}
              disabled={disabled}
              onPress={() => onChange(startOfDay(cell.date))}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={cell.date.toLocaleDateString('pt-PT')}
              style={({ pressed }) => [
                styles.dayCell,
                !cell.inCurrentMonth && styles.dayCellOutside,
                selected && styles.dayCellSelected,
                isToday && !selected && styles.dayCellToday,
                disabled && styles.dayCellDisabled,
                pressed && !disabled && styles.dayCellPressed,
              ]}>
              <Text
                variant="body"
                style={[
                  styles.dayLabel,
                  !cell.inCurrentMonth && styles.dayLabelOutside,
                  selected && styles.dayLabelSelected,
                  disabled && styles.dayLabelDisabled,
                ]}>
                {cell.date.getDate()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navButtonPressed: {
    opacity: 0.85,
  },
  monthLabel: {
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 11,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
  },
  dayCellOutside: {
    opacity: 0.45,
  },
  dayCellSelected: {
    backgroundColor: colors.primary,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  dayCellDisabled: {
    opacity: 0.28,
  },
  dayCellPressed: {
    backgroundColor: colors.primaryMuted,
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  dayLabelOutside: {
    color: colors.textMuted,
  },
  dayLabelSelected: {
    color: colors.textInverse,
    fontWeight: '700',
  },
  dayLabelDisabled: {
    color: colors.textMuted,
  },
});
