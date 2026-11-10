import { useImperativeHandle, useRef, useState, type Ref } from 'react';
import { StyleSheet, View, type TextInputInstance } from 'react-native';

import { isValidCalendarDate, type CalendarDate } from '@/core/finance';

import { spacing } from '../theme';
import { Text } from './Text';
import { TextField } from './TextField';

type Labels = {
  day: string;
  month: string;
  year: string;
  invalid: string;
  dayPlaceholder: string;
  monthPlaceholder: string;
  yearPlaceholder: string;
};

type Props = {
  /** Título do grupo (ex.: "De"). */
  label: string;
  /** `null`: campos vazios (ex.: data de nascimento ainda por indicar). */
  value: CalendarDate | null;
  onChange: (value: CalendarDate) => void;
  labels: Labels;
  helperText?: string;
  /** Erro vindo de fora (ex.: campo obrigatório); tem prioridade sobre o da data. */
  errorText?: string;
  /** Ano completo: passar ao campo seguinte do formulário. */
  onComplete?: () => void;
  /** `focus()` põe o cursor no dia (vindo do campo anterior). */
  ref?: Ref<{ focus(): void }>;
};

type Parts = { day: string; month: string; year: string };

function split(value: CalendarDate | null): Parts {
  const [year = '', month = '', day = ''] = value ? value.split('-') : [];
  return { day, month, year };
}

function join(parts: Parts): CalendarDate | null {
  if (!/^\d{1,2}$/.test(parts.day) || !/^\d{1,2}$/.test(parts.month)) return null;
  if (!/^\d{4}$/.test(parts.year)) return null;
  const candidate = `${parts.year}-${parts.month.padStart(2, '0')}-${parts.day.padStart(2, '0')}`;
  return isValidCalendarDate(candidate) ? candidate : null;
}

/** Data de calendário escrita em três campos: dia, mês e ano. */
/**
 * O dia ou o mês já não podem receber mais algarismos: "12", ou "4" no dia (não há dia 40) e "2"
 * no mês (não há mês 20). O teclado numérico do iPhone não tem tecla "Seguinte": o salto é
 * automático, como nos formulários de bancos.
 */
function filled(key: keyof Parts, text: string): boolean {
  if (key === 'year') return text.length === 4;
  if (text.length === 2) return true;
  const first = Number(text);
  return text.length === 1 && (key === 'day' ? first > 3 : first > 1);
}

export function DateFields({
  label,
  value,
  onChange,
  labels,
  helperText,
  errorText,
  onComplete,
  ref,
}: Props) {
  const [parts, setParts] = useState<Parts>(() => split(value));
  const day = useRef<TextInputInstance>(null);
  const month = useRef<TextInputInstance>(null);
  const year = useRef<TextInputInstance>(null);
  useImperativeHandle(ref, () => ({ focus: () => day.current?.focus() }), []);
  const [shown, setShown] = useState(value);

  // Valor mudado de fora (ex.: outro período): mostra-o, sem apagar o que se está a escrever.
  if (shown !== value) {
    setShown(value);
    if (value !== null && join(parts) !== value) setParts(split(value));
  }

  const update = (key: keyof Parts, text: string) => {
    const digits = text.replace(/\D/g, '');
    const typing = digits.length > parts[key].length;
    const next = { ...parts, [key]: digits };
    setParts(next);
    // Só ao escrever (não ao apagar) e com o campo cheio.
    if (typing && filled(key, digits)) {
      if (key === 'day') month.current?.focus();
      else if (key === 'month') year.current?.focus();
      else onComplete?.();
    }
    const date = join(next);
    if (date && date !== value) {
      setShown(date);
      onChange(date);
    }
  };

  const started = Boolean(parts.day || parts.month || parts.year);
  const message = errorText ?? (started && join(parts) === null ? labels.invalid : undefined);

  return (
    <View style={styles.container} accessibilityRole="none" accessibilityLabel={label}>
      <Text variant="label">{label}</Text>
      <View style={styles.row}>
        <View style={styles.small}>
          <TextField
            ref={day}
            label={labels.day}
            value={parts.day}
            onChangeText={(text) => update('day', text)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={labels.dayPlaceholder}
            accessibilityLabel={`${label}: ${labels.day}`}
          />
        </View>
        <View style={styles.small}>
          <TextField
            ref={month}
            label={labels.month}
            value={parts.month}
            onChangeText={(text) => update('month', text)}
            keyboardType="number-pad"
            maxLength={2}
            placeholder={labels.monthPlaceholder}
            accessibilityLabel={`${label}: ${labels.month}`}
          />
        </View>
        <View style={styles.large}>
          <TextField
            ref={year}
            label={labels.year}
            value={parts.year}
            onChangeText={(text) => update('year', text)}
            keyboardType="number-pad"
            maxLength={4}
            placeholder={labels.yearPlaceholder}
            accessibilityLabel={`${label}: ${labels.year}`}
          />
        </View>
      </View>
      {message ? (
        <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
          {message}
        </Text>
      ) : helperText ? (
        <Text variant="footnote" tone="secondary">
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  small: {
    flex: 1,
  },
  large: {
    flex: 1.6,
  },
});
