import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MAX_YEAR, MIN_YEAR, monthKeyFrom, type MonthKey } from '@/core/finance';

import { useBreakpoint } from '../layout/useBreakpoint';
import { layout, radius, spacing, useTheme } from '../theme';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Text } from './Text';

export type MonthYearPickerLabels = {
  title: string;
  previousYear: string;
  nextYear: string;
  currentMonth: string;
  close: string;
};

type Props = {
  visible: boolean;
  value: MonthKey;
  currentMonth: MonthKey;
  locale: string;
  labels: MonthYearPickerLabels;
  onChange: (month: MonthKey) => void;
  onDismiss: () => void;
};

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** "jun." → "Jun": abreviatura do idioma, com maiúscula e sem ponto final. */
function shortName(formatter: Intl.DateTimeFormat, year: number, month: number, locale: string) {
  const text = formatter.format(new Date(year, month - 1, 1)).replace(/\.$/, '');
  return text.charAt(0).toLocaleUpperCase(locale) + text.slice(1);
}

/**
 * Escolha direta de mês e ano: ano com setas e os 12 meses numa grelha. No telemóvel abre como
 * folha em baixo; em tablet e desktop, como diálogo centrado. Escolher um mês fecha logo.
 * O Modal do react-native-web chama `onRequestClose` com Escape.
 */
export function MonthYearPicker({
  visible,
  value,
  currentMonth,
  locale,
  labels,
  onChange,
  onDismiss,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useBreakpoint() === 'compact';
  const valueYear = Number(value.slice(0, 4));
  const [year, setYear] = useState(valueYear);
  const [opened, setOpened] = useState(visible);
  // Ao abrir, o ano mostrado é o do mês escolhido.
  if (visible !== opened) {
    setOpened(visible);
    if (visible) setYear(valueYear);
  }

  const shortFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short' }),
    [locale],
  );
  const longFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }),
    [locale],
  );

  const choose = (month: MonthKey) => {
    onChange(month);
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType={sheet ? 'slide' : 'fade'}
      onRequestClose={onDismiss}>
      <View style={[styles.root, sheet ? styles.rootSheet : styles.rootDialog]}>
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
          accessible={false}
          importantForAccessibility="no"
          onPress={onDismiss}
        />
        <View
          accessibilityViewIsModal
          style={[
            styles.panel,
            sheet ? styles.sheet : styles.dialog,
            { backgroundColor: colors.surface, borderColor: colors.border },
            sheet && { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm },
          ]}>
          <View style={styles.header}>
            <Text variant="title3" style={styles.flex}>
              {labels.title}
            </Text>
            <IconButton icon="close" accessibilityLabel={labels.close} onPress={onDismiss} />
          </View>

          <View style={styles.yearRow}>
            <IconButton
              icon="chevron-back"
              accessibilityLabel={labels.previousYear}
              disabled={year <= MIN_YEAR}
              onPress={() => setYear((current) => Math.max(MIN_YEAR, current - 1))}
            />
            <Text variant="title3" tabular accessibilityLiveRegion="polite">
              {String(year)}
            </Text>
            <IconButton
              icon="chevron-forward"
              accessibilityLabel={labels.nextYear}
              disabled={year >= MAX_YEAR}
              onPress={() => setYear((current) => Math.min(MAX_YEAR, current + 1))}
            />
          </View>

          <View style={styles.grid}>
            {MONTHS.map((month) => {
              const key = monthKeyFrom(year, month);
              const selected = key === value;
              const isCurrent = key === currentMonth && !selected;
              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={longFormatter.format(new Date(year, month - 1, 1))}
                  accessibilityState={{ selected }}
                  onPress={() => choose(key)}
                  style={({ pressed }) => [
                    styles.cell,
                    {
                      backgroundColor: selected
                        ? colors.primary
                        : pressed
                          ? colors.surfaceMuted
                          : 'transparent',
                      borderColor: isCurrent ? colors.primary : 'transparent',
                    },
                  ]}>
                  <Text
                    variant="label"
                    style={{ color: selected ? colors.onPrimary : colors.text }}>
                    {shortName(shortFormatter, year, month, locale)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Button
              label={labels.currentMonth}
              icon="today-outline"
              variant="ghost"
              size="sm"
              onPress={() => choose(currentMonth)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rootSheet: { justifyContent: 'flex-end' },
  rootDialog: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  panel: { borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  sheet: {
    width: '100%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomWidth: 0,
  },
  dialog: { width: '100%', maxWidth: 380, borderRadius: radius.xl },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  cell: {
    width: '33.333%',
    minHeight: layout.minTouchTarget + 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1.5,
  },
  footer: { alignItems: 'center' },
});
