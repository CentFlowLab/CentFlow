import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { addDays, calendarDateToLocalDate, type CalendarDate } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import {
  Button,
  CalendarPicker,
  Chip,
  ChipGroup,
  DateFields,
  FadeIn,
  FormKeyboardContext,
  Icon,
  Text,
  useFormKeyboard,
  type MonthYearPickerLabels,
  type ViewHandle,
} from '@/ui/components';
import { layout, radius, spacing, useTheme } from '@/ui/theme';

/**
 * Datas em toda a app (ADR-074): o mesmo campo, o mesmo painel e o mesmo calendário. O campo está
 * fechado e mostra a data; ao tocar abre por baixo a data escrita (dia, mês, ano) e o calendário,
 * cujo título abre a escolha de mês e ano. Escolher um dia fecha o painel. Só um painel aberto de
 * cada vez em todo o ecrã.
 */

/** Rótulos do seletor de mês e ano (calendários e barras de mês). */
export function useMonthPickerLabels(): MonthYearPickerLabels {
  const { t } = useTranslation();
  return {
    title: t('monthPicker.title'),
    previousYear: t('calendar.previousYear'),
    nextYear: t('calendar.nextYear'),
    currentMonth: t('monthPicker.currentMonth'),
    close: t('common.close'),
  };
}

/** Rótulos do calendário, com a escolha de mês e ano ao tocar no título. */
function useCalendarLabels() {
  const { t } = useTranslation();
  const monthPicker = useMonthPickerLabels();
  return {
    previousMonth: t('calendar.previousMonth'),
    nextMonth: t('calendar.nextMonth'),
    // O calendário põe o mês no lugar de {{month}}.
    monthPicker: { ...monthPicker, open: t('monthPicker.open', { month: '{{month}}' }) },
  };
}

/** Um só painel de data aberto: abrir outro fecha o anterior. */
let closeOpenPanel: (() => void) | null = null;

function useSinglePanel(): [boolean, (open: boolean | ((current: boolean) => boolean)) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    closeOpenPanel?.();
    closeOpenPanel = close;
    return () => {
      if (closeOpenPanel === close) closeOpenPanel = null;
    };
  }, [open]);
  return [open, setOpen];
}

/**
 * Painel aberto: o teclado fecha e o painel fica à vista; focar outro campo do formulário fecha-o,
 * para o calendário nunca ficar aberto escondido atrás do teclado desse campo (ADR-080).
 */
function usePanelKeyboard(open: boolean, setOpen: (open: boolean) => void) {
  const keyboard = useFormKeyboard();
  const panel = useRef<ViewHandle>(null);
  useEffect(() => {
    if (!open) return;
    Keyboard.dismiss();
    keyboard?.scrollIntoView(panel);
    return keyboard?.addFocusListener(() => setOpen(false));
  }, [open, keyboard, setOpen]);
  return panel;
}

/** Data escrita, calendário e as ações do painel (remover, quando opcional, e concluir). */
function DatePanel({
  label,
  value,
  today,
  optional,
  onChange,
  onClose,
  panelRef,
}: {
  label: string;
  value: CalendarDate | null;
  today: CalendarDate;
  optional: boolean;
  onChange: (value: CalendarDate | null) => void;
  onClose: () => void;
  panelRef: RefObject<ViewHandle | null>;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { locale } = useLocaleFormat();
  const labels = useCalendarLabels();
  const outer = useFormKeyboard();
  // Os campos do próprio painel não o fecham: ao focá-los, o formulário rola até ao painel
  // (dia, mês, ano e o início do calendário ficam acima do teclado) (ADR-080).
  const inner = useMemo(
    () => (outer ? { ...outer, onFieldFocus: () => outer.scrollIntoView(panelRef) } : null),
    [outer, panelRef],
  );
  return (
    <FadeIn style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text variant="footnote" tone="secondary">
        {t('optionalDate.typeOrPick')}
      </Text>
      <FormKeyboardContext.Provider value={inner}>
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
      </FormKeyboardContext.Provider>
      <CalendarPicker
        value={value ?? today}
        today={today}
        locale={locale}
        labels={labels}
        onChange={(date) => {
          onChange(date);
          onClose();
        }}
      />
      <View style={styles.actions}>
        {optional && value ? (
          <Button
            label={t('optionalDate.clear')}
            variant="ghost"
            size="sm"
            onPress={() => {
              onChange(null);
              onClose();
            }}
          />
        ) : null}
        <Button label={t('optionalDate.done')} variant="secondary" size="sm" onPress={onClose} />
      </View>
    </FadeIn>
  );
}

type DateFieldProps = {
  label: string;
  today: CalendarDate;
  errorText?: string;
  helperText?: string;
} & (
  | { optional: true; value: CalendarDate | null; onChange: (value: CalendarDate | null) => void }
  | { optional?: false; value: CalendarDate | null; onChange: (value: CalendarDate) => void }
);

/** Campo de data: fechado mostra a data ("Sem data" se ainda não houver); abre o painel. */
export function DateField(props: DateFieldProps) {
  const { label, value, today, errorText, helperText } = props;
  const optional = props.optional === true;
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate } = useLocaleFormat();
  const [open, setOpen] = useSinglePanel();
  const [hovered, setHovered] = useState(false);
  const panel = usePanelKeyboard(open, setOpen);
  const shown = value
    ? formatDate(calendarDateToLocalDate(value), 'medium')
    : t('optionalDate.empty');
  const change = (next: CalendarDate | null) => {
    if (props.optional === true) props.onChange(next);
    else if (next !== null) props.onChange(next);
  };

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
        onHoverIn={() => setHovered(true)}
        onHoverOut={() => setHovered(false)}
        style={({ pressed }) => [
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
        <View ref={panel} collapsable={false}>
          <DatePanel
            label={label}
            value={value}
            today={today}
            optional={optional}
            onChange={change}
            onClose={() => setOpen(false)}
            panelRef={panel}
          />
        </View>
      ) : null}
      {errorText ? (
        <Text variant="footnote" tone="negative">
          {errorText}
        </Text>
      ) : helperText ? (
        <Text variant="footnote" tone="tertiary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Data com atalhos Hoje e Ontem (registos do dia a dia). "Escolher data" abre o mesmo painel dos
 * restantes campos de data.
 */
export function DateChips({
  label,
  value,
  today,
  onChange,
  errorText,
}: {
  label: string;
  value: CalendarDate;
  today: CalendarDate;
  onChange: (value: CalendarDate) => void;
  errorText?: string;
}) {
  const { t } = useTranslation();
  const { formatDate } = useLocaleFormat();
  const [open, setOpen] = useSinglePanel();
  const panel = usePanelKeyboard(open, setOpen);
  const yesterday = addDays(today, -1);
  const custom = value !== today && value !== yesterday;
  return (
    <View style={styles.field}>
      <ChipGroup label={label} errorText={errorText}>
        <Chip
          label={t('common.today')}
          selected={value === today}
          onPress={() => {
            onChange(today);
            setOpen(false);
          }}
        />
        <Chip
          label={t('common.yesterday')}
          selected={value === yesterday}
          onPress={() => {
            onChange(yesterday);
            setOpen(false);
          }}
        />
        <Chip
          label={
            custom ? formatDate(calendarDateToLocalDate(value), 'medium') : t('entryForm.pickDate')
          }
          icon="calendar-outline"
          selected={custom}
          onPress={() => setOpen((current) => !current)}
        />
      </ChipGroup>
      {open ? (
        <View ref={panel} collapsable={false}>
          <DatePanel
            label={label}
            value={value}
            today={today}
            optional={false}
            onChange={(next) => {
              if (next) onChange(next);
            }}
            onClose={() => setOpen(false)}
            panelRef={panel}
          />
        </View>
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm },
});
