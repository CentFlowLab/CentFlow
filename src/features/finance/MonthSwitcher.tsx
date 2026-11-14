import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  addMonths,
  calendarDateToLocalDate,
  clampMonthKey,
  financialMonthRange,
  monthKeyToLocalDate,
  type MonthKey,
} from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { Icon, IconButton, MonthYearPicker, Text } from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

import { useMonthPickerLabels } from './DateField';
import { useHaptics } from '../preferences';

/**
 * Barra de mês de Início e Orçamentos: setas para o mês anterior e seguinte e, ao tocar no mês, a
 * escolha direta de mês e ano (o mesmo seletor dos calendários). Escolher pelo seletor dá o mesmo
 * resultado que chegar lá pelas setas: só muda `month`.
 */
export function MonthSwitcher({
  month,
  currentMonth,
  startDay = 1,
  onChange,
}: {
  month: MonthKey;
  currentMonth: MonthKey;
  /** Início do mês financeiro (ADR-077): com outro dia que não o 1, mostra o intervalo. */
  startDay?: number;
  onChange: (month: MonthKey) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMonthYear, locale } = useLocaleFormat();
  const labels = useMonthPickerLabels();
  const [picking, setPicking] = useState(false);
  const raw = formatMonthYear(monthKeyToLocalDate(month));
  const label = raw.charAt(0).toLocaleUpperCase(locale) + raw.slice(1);
  const range = financialMonthRange(month, startDay);
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const short = (date: string) => dayMonth.format(calendarDateToLocalDate(date)).replace('.', '');
  // Dia de início diferente de 1: "25 out – 24 nov" por baixo do nome do período.
  const span = startDay > 1 ? `${short(range.start)} – ${short(range.end)}` : null;
  const haptic = useHaptics();
  const go = (next: MonthKey) => {
    const target = clampMonthKey(next);
    if (target !== month) haptic.selection();
    onChange(target);
  };

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconButton
        icon="chevron-back"
        accessibilityLabel={t('dashboard.previousMonth')}
        onPress={() => go(addMonths(month, -1))}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('monthPicker.open', { month: span ? `${label} (${span})` : label })}
        onPress={() => setPicking(true)}
        style={({ pressed }) => [
          styles.title,
          pressed && { backgroundColor: colors.surfaceMuted },
        ]}>
        <View style={styles.titleTexts}>
          <View style={styles.titleRow}>
            <Text variant="title3" align="center" accessibilityLiveRegion="polite">
              {label}
            </Text>
            <Icon name="chevron-down" size={16} color="textSecondary" />
          </View>
          {span ? (
            <Text variant="caption" tone="secondary" align="center">
              {span}
            </Text>
          ) : null}
        </View>
      </Pressable>
      <IconButton
        icon="chevron-forward"
        accessibilityLabel={t('dashboard.nextMonth')}
        onPress={() => go(addMonths(month, 1))}
      />
      <MonthYearPicker
        visible={picking}
        value={month}
        currentMonth={currentMonth}
        locale={locale}
        labels={labels}
        onChange={go}
        onDismiss={() => setPicking(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.xs,
  },
  titleTexts: { alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: layout.minTouchTarget,
    borderRadius: radius.full,
  },
});
