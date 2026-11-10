import { useId, useState, type ReactNode, type Ref } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputInstance,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { layout, radius, spacing, typography, useTheme } from '../theme';
import { Text } from './Text';

type Props = Omit<TextInputProps, 'style'> & {
  label: string;
  helperText?: string;
  errorText?: string;
  /** Controlo dentro do campo, por exemplo mostrar ou esconder a palavra-passe. */
  trailing?: ReactNode;
  inputStyle?: StyleProp<TextStyle>;
  ref?: Ref<TextInputInstance>;
};

export function TextField({
  label,
  helperText,
  errorText,
  trailing,
  inputStyle,
  onFocus,
  onBlur,
  ref,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const hasError = Boolean(errorText);

  const borderColor = hasError ? colors.negative : focused ? colors.primary : colors.border;
  const input = (
    <TextInput
      ref={ref}
      accessibilityLabel={label}
      // Um rótulo explícito (ex.: "De: Dia") substitui o rótulo visível, que pode repetir-se.
      accessibilityLabelledBy={rest.accessibilityLabel ? undefined : `${inputId}-label`}
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
        trailing ? styles.inputWithTrailing : null,
        trailing
          ? { color: colors.text }
          : {
              color: colors.text,
              backgroundColor: colors.surface,
              borderColor,
              borderWidth: focused || hasError ? 1.5 : 1,
            },
        inputStyle,
      ]}
      {...rest}
    />
  );

  return (
    <View style={styles.container}>
      <Text variant="label" tone="secondary" nativeID={`${inputId}-label`}>
        {label}
      </Text>
      {trailing ? (
        <View
          style={[
            styles.trailingRow,
            {
              backgroundColor: colors.surface,
              borderColor,
              borderWidth: focused || hasError ? 1.5 : 1,
            },
          ]}>
          {input}
          {trailing}
        </View>
      ) : (
        input
      )}
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
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
  },
  inputWithTrailing: {
    flex: 1,
    minWidth: 0,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: 0,
    paddingRight: spacing.xs,
  },
  trailingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: layout.minTouchTarget + 4,
    borderRadius: radius.lg,
    paddingLeft: spacing.md + 2,
  },
});
