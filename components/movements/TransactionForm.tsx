import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/layout';
import { Text, TextField } from '@/components/ui';
import { getCategoriesForType } from '@/lib/data/transaction-categories';
import type { TransactionFormValues } from '@/lib/domain/transaction-form';
import type { TransactionType } from '@/lib/domain/transaction.types';
import { colors, radius, spacing } from '@/lib/theme';
import { DATE_INPUT_PLACEHOLDER } from '@/lib/utils/format';

type TransactionFormProps = {
  values: TransactionFormValues;
  onChange: (values: TransactionFormValues) => void;
  errors?: Record<string, string>;
};

const TYPE_SEGMENTS = [
  { key: 'expense' as const, label: 'Despesa' },
  { key: 'income' as const, label: 'Receita' },
];

export function TransactionForm({ values, onChange, errors }: TransactionFormProps) {
  const categories = getCategoriesForType(values.type);

  function update<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ) {
    onChange({ ...values, [key]: value });
  }

  function handleTypeChange(type: TransactionType) {
    onChange({ ...values, type, category: '' });
  }

  return (
    <View style={styles.form}>
      <SegmentedControl
        segments={TYPE_SEGMENTS}
        value={values.type}
        onChange={handleTypeChange}
      />

      <TextField
        label="Valor (€)"
        value={values.amount}
        onChangeText={(amount) => update('amount', amount)}
        keyboardType="decimal-pad"
        placeholder="0,00"
        error={errors?.amount}
      />

      <View style={styles.field}>
        <Text variant="caption" color="textSecondary" style={styles.fieldLabel}>
          Categoria
        </Text>
        <View style={styles.categoryGrid}>
          {categories.map((item) => {
            const isSelected = values.category === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => update('category', item.id)}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}>
                <SymbolView
                  name={item.icon}
                  tintColor={isSelected ? colors.primary : colors.textMuted}
                  size={16}
                />
                <Text
                  variant="caption"
                  color={isSelected ? 'text' : 'textMuted'}
                  style={isSelected ? styles.categoryLabelActive : undefined}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors?.category ? (
          <Text variant="caption" color="danger" style={styles.fieldError}>
            {errors.category}
          </Text>
        ) : null}
      </View>

      <TextField
        label="Descrição (opcional)"
        value={values.description}
        onChangeText={(description) => update('description', description)}
        placeholder="Ex: Jantar com amigos"
        maxLength={200}
      />

      <TextField
        label="Data"
        value={values.date}
        onChangeText={(date) => update('date', date)}
        placeholder={DATE_INPUT_PLACEHOLDER}
        error={errors?.date}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
  field: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontWeight: '500',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  categoryLabelActive: {
    fontWeight: '600',
  },
  fieldError: {
    marginTop: spacing.xs,
  },
});
