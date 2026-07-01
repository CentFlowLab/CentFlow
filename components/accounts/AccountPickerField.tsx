import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { ACCOUNTS_FEATURE_ENABLED } from '@/lib/config/product-features';
import { colors, radius, spacing } from '@/lib/theme';

type AccountPickerFieldProps = {
  value?: string;
  onChange: (accountId: string | undefined) => void;
};

export function AccountPickerField({ value, onChange }: AccountPickerFieldProps) {
  const { data: accounts = [] } = useAccounts();
  const activeAccounts = accounts.filter((account) => account.isActive);

  if (!ACCOUNTS_FEATURE_ENABLED || activeAccounts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text variant="label" color="textSecondary">
        Conta (opcional)
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.chip, !value && styles.chipActive]}
          accessibilityRole="button"
          accessibilityState={{ selected: !value }}>
          <Text variant="caption" style={!value ? styles.chipTextActive : undefined}>
            Nenhuma
          </Text>
        </Pressable>
        {activeAccounts.map((account) => {
          const selected = value === account.id;
          return (
            <Pressable
              key={account.id}
              onPress={() => onChange(account.id)}
              style={[styles.chip, selected && styles.chipActive]}
              accessibilityRole="button"
              accessibilityState={{ selected }}>
              <Text variant="caption" style={selected ? styles.chipTextActive : undefined}>
                {account.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
