import {
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, radius, spacing } from '@/lib/theme';

import { Text } from './Text';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  /** Destaque visual quando o valor veio do OCR e ainda não foi editado */
  ocrHighlighted?: boolean;
};

export function TextField({ label, error, ocrHighlighted, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
        {ocrHighlighted ? (
          <View style={styles.ocrBadge}>
            <Text variant="caption" color="accent" style={styles.ocrBadgeText}>
              OCR
            </Text>
          </View>
        ) : null}
      </View>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          ocrHighlighted && styles.inputOcr,
          error && styles.inputError,
          style,
        ]}
        {...props}
      />
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    fontWeight: '500',
  },
  ocrBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: colors.accentMuted,
  },
  ocrBadgeText: {
    fontWeight: '600',
    fontSize: 10,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 48,
  },
  inputOcr: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    marginTop: spacing.xs,
  },
});
