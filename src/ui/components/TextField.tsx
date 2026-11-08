import { useId, useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { layout, radius, spacing, typography, useTheme } from '../theme';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  errorText?: string;
};

export function TextField({ label, helperText, errorText, onFocus, onBlur, ...rest }: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.negative : focused ? colors.primary : colors.border;

  return (
    <View style={styles.container}>
      <Text variant="label" tone="secondary" nativeID={`${inputId}-label`}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityLabelledBy={`${inputId}-label`}
        placeholderTextColor={colors.textTertiary}
        selectionColor={colors.primary}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          typography.body,
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.surface,
            borderColor,
            borderWidth: focused || hasError ? 1.5 : 1,
          },
        ]}
        {...rest}
      />
      {errorText || helperText ? (
        <Text
          variant="footnote"
          tone={hasError ? 'negative' : 'tertiary'}
          accessibilityLiveRegion={hasError ? 'polite' : 'none'}>
          {errorText ?? helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs + 2,
  },
  input: {
    minHeight: layout.minTouchTarget + 4,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
});
