import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import type { Transaction } from '@/lib/domain/transaction.types';
import { colors, layout, radius, spacing } from '@/lib/theme';
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

function receiptLabel(transaction: Transaction): string {
  return (
    transaction.description?.trim() ||
    transaction.categoryLabel ||
    'Movimento com talão'
  );
}

export function WarrantyReceiptPicker({
  transactions,
  selectedId,
  onSelect,
  isLoading = false,
}: WarrantyReceiptPickerProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const withReceipt = useMemo(
    () => transactions.filter(hasTransactionReceipt),
    [transactions],
  );

  const selected = useMemo(
    () => withReceipt.find((tx) => tx.id === selectedId) ?? null,
    [withReceipt, selectedId],
  );

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
          size={20}
        />
        <Text variant="caption" color="textSecondary">
          Ainda não tens movimentos com talão. Digitaliza uma fatura em Movimentos para associar
          depois.
        </Text>
      </Card>
    );
  }

  if (selected && !pickerOpen) {
    return (
      <Card variant="outlined" padding="md" style={styles.selectedCard}>
        <View style={styles.selectedIcon}>
          <SymbolView
            name={{
              ios: 'doc.text.viewfinder',
              android: 'document_scanner',
              web: 'document_scanner',
            }}
            tintColor={colors.primary}
            size={18}
          />
        </View>
        <View style={styles.selectedText}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {receiptLabel(selected)}
          </Text>
          <Text variant="caption" color="textMuted">
            {formatDateShort(selected.date)} · {formatCurrency(selected.amount)}
          </Text>
        </View>
        <Button
          label="Trocar"
          variant="secondary"
          size="sm"
          onPress={() => setPickerOpen(true)}
        />
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {selected ? (
        <Pressable onPress={() => setPickerOpen(false)} style={styles.backLink}>
          <Text variant="caption" color="primary">
            ← Voltar ao talão seleccionado
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => onSelect(null)}
        style={({ pressed }) => [
          styles.option,
          !selectedId && styles.optionSelected,
          pressed && styles.optionPressed,
        ]}>
        <Text variant="caption" color={!selectedId ? 'primary' : 'textMuted'}>
          Sem talão associado
        </Text>
      </Pressable>

      {withReceipt.map((transaction) => {
        const isSelected = selectedId === transaction.id;
        const label = receiptLabel(transaction);

        return (
          <Pressable
            key={transaction.id}
            onPress={() => {
              onSelect(transaction);
              setPickerOpen(false);
            }}
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
                size={16}
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
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.primary,
  },
  selectedIcon: {
    width: layout.chipHeight,
    height: layout.chipHeight,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedText: {
    flex: 1,
    gap: spacing.xs,
  },
  backLink: {
    paddingVertical: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: layout.chipHeight + spacing.sm,
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
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceHighlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
});
