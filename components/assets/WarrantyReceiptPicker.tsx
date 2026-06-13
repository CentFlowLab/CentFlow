import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

export function hasTransactionReceipt(transaction: Transaction): boolean {
  return Boolean(transaction.receiptId || transaction.receiptImage || transaction.receiptUrl);
}

type WarrantyReceiptPickerProps = {
  transactions: Transaction[];
  selectedId?: string;
  onSelect: (transaction: Transaction | null) => void;
  isLoading?: boolean;
};

export function WarrantyReceiptPicker({
  transactions,
  selectedId,
  onSelect,
  isLoading = false,
}: WarrantyReceiptPickerProps) {
  const withReceipt = transactions.filter(hasTransactionReceipt);

  if (isLoading) {
    return (
      <Card variant="outlined" padding="md">
        <Text variant="caption" color="textMuted">
          A carregar talões...
        </Text>
      </Card>
    );
  }

  if (withReceipt.length === 0) {
    return (
      <Card variant="outlined" padding="md" style={styles.emptyCard}>
        <SymbolView
          name={{ ios: 'doc.text', android: 'description', web: 'description' }}
          tintColor={colors.textMuted}
          size={22}
        />
        <Text variant="body" color="textSecondary">
          Ainda não tens movimentos com talão. Digitaliza uma fatura em Movimentos para associar
          depois.
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      <Pressable
        onPress={() => onSelect(null)}
        style={({ pressed }) => [
          styles.option,
          !selectedId && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}>
        <Text variant="bodyMedium" color={!selectedId ? 'primary' : 'textSecondary'}>
          Sem talão associado
        </Text>
      </Pressable>

      {withReceipt.map((transaction) => {
        const isSelected = selectedId === transaction.id;
        const label =
          transaction.description?.trim() ||
          transaction.categoryLabel ||
          'Movimento com talão';

        return (
          <Pressable
            key={transaction.id}
            onPress={() => onSelect(transaction)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.optionSelected,
              pressed && styles.optionPressed,
            ]}>
            <View style={styles.optionIcon}>
              <SymbolView
                name={{
                  ios: 'doc.text.viewfinder',
                  android: 'document_scanner',
                  web: 'document_scanner',
                }}
                tintColor={isSelected ? colors.primary : colors.textMuted}
                size={18}
              />
            </View>
            <View style={styles.optionText}>
              <Text variant="bodyMedium" numberOfLines={1}>
                {label}
              </Text>
              <Text variant="caption" color="textMuted">
                {formatDateShort(transaction.date)} · {formatCurrency(transaction.amount)}
              </Text>
            </View>
            {isSelected ? (
              <SymbolView
                name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                tintColor={colors.primary}
                size={18}
              />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  optionPressed: {
    opacity: 0.9,
  },
  optionIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
});
