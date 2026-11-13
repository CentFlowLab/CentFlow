import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type CalendarDate } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { Button, CalendarPicker, DateFields, FadeIn, Icon, Text } from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

type Props = {
  label: string;
  value: CalendarDate | null;
  today: CalendarDate;
  errorText?: string;
  onChange: (value: CalendarDate | null) => void;
};

/**
 * Só um calendário aberto de cada vez em todo o ecrã: abrir um fecha o anterior. Um registo no
 * módulo chega (há um só ecrã de formulário à vista).
 */
let closeOpenField: (() => void) | null = null;

/**
 * Data opcional fechada por omissão: mostra só a data escolhida (ou "Sem data"). Ao tocar, abre por
 * baixo a data escrita (dia, mês, ano) e o calendário; escolher um dia no calendário fecha-o.
 * "Remover data" deixa o campo vazio.
 */
export function OptionalDateField({ label, value, today, errorText, onChange }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, locale } = useLocaleFormat();
  const [open, setOpen] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    closeOpenField?.();
    closeOpenField = close;
    return () => {
      if (closeOpenField === close) closeOpenField = null;
    };
  }, [open, id]);

  const shown = value
    ? formatDate(calendarDateToLocalDate(value), 'medium')
    : t('optionalDate.empty');

  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary">
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown}`}
        aria-expanded={open}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed, hovered }) => [
          styles.trigger,
          {
            backgroundColor: pressed || hovered ? colors.surfaceHover : colors.surface,
            borderColor: errorText ? colors.negative : open ? colors.primary : colors.border,
          },
        ]}>
        <Icon name="calendar-outline" size={18} color={value ? 'primaryText' : 'textTertiary'} />
        <Text variant="body" tone={value ? 'primary' : 'tertiary'} style={styles.value}>
          {shown}
        </Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color="textTertiary" />
      </Pressable>

      {open ? (
        <FadeIn
          style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text variant="footnote" tone="secondary">
            {t('optionalDate.typeOrPick')}
          </Text>
          <DateFields
            label={label}
            hideLabel
            value={value}
            onChange={(date) => onChange(date)}
            labels={{
              day: t('calendar.day'),
              month: t('calendar.month'),
              year: t('calendar.year'),
              dayPlaceholder: t('calendar.dayPlaceholder'),
              monthPlaceholder: t('calendar.monthPlaceholder'),
              yearPlaceholder: t('calendar.yearPlaceholder'),
              invalid: t('calendar.invalid'),
            }}
          />
          <CalendarPicker
            value={value ?? today}
            today={today}
            locale={locale}
            labels={{
              previousMonth: t('calendar.previousMonth'),
              nextMonth: t('calendar.nextMonth'),
              previousYear: t('calendar.previousYear'),
              nextYear: t('calendar.nextYear'),
            }}
            onChange={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
          <View style={styles.actions}>
            {value ? (
              <Button
                label={t('optionalDate.clear')}
                variant="ghost"
                size="sm"
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
              />
            ) : null}
            <Button
              label={t('optionalDate.done')}
              variant="secondary"
              size="sm"
              onPress={() => setOpen(false)}
            />
          </View>
        </FadeIn>
      ) : null}
      {errorText ? (
        <Text variant="footnote" tone="negative">
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: layout.minTouchTarget + 4,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  value: { flex: 1 },
  panel: {
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
  },
});
