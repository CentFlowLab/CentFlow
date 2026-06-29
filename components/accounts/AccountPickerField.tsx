import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAccounts } from '@/hooks/queries/useAccounts';
import { colors, radius, spacing } from '@/lib/theme';

type AccountPickerFieldProps = {
  value?: string;
  onChange: (accountId: string | undefined) => void;
};

export function AccountPickerField({ value, onChange }: AccountPickerFieldProps) {
  const { data: accounts = [] } = useAccounts();

  if (accounts.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="textMuted">
        Conta (opcional)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        <Pressable
          onPress={() => onChange(undefined)}
          style={[styles.chip, !value && styles.chipActive]}>
          <Text variant="caption" style={!value ? styles.chipTextActive : styles.chipText}>
            Nenhuma
          </Text>
        </Pressable>
        {accounts.map((account) => {
          const active = value === account.id;
          return (
            <Pressable
              key={account.id}
              onPress={() => onChange(account.id)}
              style={[styles.chip, active && styles.chipActive]}>
              <Text variant="caption" style={active ? styles.chipTextActive : styles.chipText}>
                {account.icon ?? '🏦'} {account.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.sm,
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
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
});
