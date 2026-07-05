import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { SavingsMarginBreakdownLines } from '@/components/budget/SavingsMarginBreakdownLines';
import { useToast } from '@/components/ui/Toast';
import { useSavingsAllocationAction } from '@/hooks/useSavingsAllocationAction';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

type AllocateToGoalCardProps = {
  onSuccess?: () => void;
};

export function AllocateToGoalCard({ onSuccess }: AllocateToGoalCardProps) {
  const { showToast } = useToast();
  const { action, margin, confirmAndAllocate, isPending } = useSavingsAllocationAction({
    onSuccess: () => {
      if (action) {
        showToast(
          `${formatCurrency(action.amount)} alocados em ${action.goalName}.`,
          'success',
        );
      }
      onSuccess?.();
    },
  });

  if (!action) return null;

  function handleAllocate() {
    if (!action) return;
    confirmAndAllocate(action);
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <SymbolView
            name={{ ios: 'target', android: 'flag', web: 'flag' }}
            tintColor={colors.success}
            size={20}
          />
        </View>
        <View style={styles.headerText}>
          <Text variant="h3">Margem de poupança</Text>
          <Text variant="caption" color="textMuted">
            Margem real estimada {formatCurrency(margin.rawMargin)}
          </Text>
        </View>
      </View>

      <SavingsMarginBreakdownLines margin={margin} suggestedAmount={action.amount} />

      <Text variant="body" color="textSecondary">
        Podes reservar {formatCurrency(action.amount)} para «{action.goalName}» a partir de{' '}
        {action.accountName}.
      </Text>

      <Button
        label={`Alocar ${formatCurrency(action.amount)} ao objetivo`}
        variant="success"
        onPress={handleAllocate}
        loading={isPending}
        fullWidth
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderColor: colors.success,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
});
