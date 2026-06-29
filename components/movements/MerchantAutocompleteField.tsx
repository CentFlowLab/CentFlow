import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text, TextField } from '@/components/ui';
import { useRecentMerchants } from '@/hooks/useRecentMerchants';
import { colors, radius, spacing } from '@/lib/theme';

type MerchantAutocompleteFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  maxLength?: number;
};

export function MerchantAutocompleteField({
  label = 'Comerciante / Produto (opcional)',
  value,
  onChangeText,
  placeholder = 'Ex: Continente',
  error,
  maxLength = 120,
}: MerchantAutocompleteFieldProps) {
  const recentMerchants = useRecentMerchants();
  const [focused, setFocused] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleFocus() {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    setFocused(true);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => setFocused(false), 160);
  }

  function selectSuggestion(merchant: string) {
    if (blurTimer.current) {
      clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    onChangeText(merchant);
    setFocused(false);
  }

  const suggestions = useMemo(() => {
    if (!focused) return [];

    const query = value.trim().toLowerCase();
    const pool = query
      ? recentMerchants.filter((m) => m.toLowerCase().includes(query))
      : recentMerchants;

    return pool.filter((m) => m.toLowerCase() !== query).slice(0, 8);
  }, [focused, recentMerchants, value]);

  return (
    <View style={styles.wrapper}>
      <TextField
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        error={error}
        maxLength={maxLength}
        autoCapitalize="words"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />

      {suggestions.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chips}>
          {suggestions.map((merchant) => (
            <Pressable
              key={merchant}
              onPress={() => selectSuggestion(merchant)}
              style={styles.chip}
              accessibilityRole="button"
              accessibilityLabel={`Usar ${merchant}`}>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                {merchant}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
});
