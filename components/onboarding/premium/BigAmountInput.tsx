import { StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, spacing } from '@/lib/theme';

/** Agrupa milhares com espaço fino (formato PT): 12345 → "12 345". */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '\u2009');
}

type BigAmountInputProps = {
  value: number | null;
  onChange: (value: number) => void;
  prefix?: string;
  placeholder?: string;
  autoFocus?: boolean;
  maxDigits?: number;
};

/** Input de valor com número gigante centrado e teclado numérico. */
export function BigAmountInput({
  value,
  onChange,
  prefix = '€',
  placeholder = '0',
  autoFocus = true,
  maxDigits = 8,
}: BigAmountInputProps) {
  const digits = value != null && value > 0 ? String(Math.round(value)) : '';
  const display = digits ? groupThousands(digits) : '';

  return (
    <View style={styles.wrap}>
      <Text style={styles.prefix}>{prefix}</Text>
      <View style={styles.inputWrap}>
        <TextInput
          value={display}
          onChangeText={(text) => {
            const clean = text.replace(/\D/g, '').slice(0, maxDigits);
            onChange(clean ? Number(clean) : 0);
          }}
          keyboardType="number-pad"
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          style={styles.input}
          caretHidden={false}
          selectionColor={colors.primary}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  prefix: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inputWrap: {
    minWidth: 80,
  },
  input: {
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
    textAlign: 'center',
    padding: 0,
    minWidth: 80,
  },
});
