import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/layout';
import { DatePickerField, TextField } from '@/components/ui';
import type { TransactionFormValues } from '@/lib/domain/transaction-form';
import type { TransactionType } from '@/lib/domain/transaction.types';
import { spacing } from '@/lib/theme';

import { CategoryField } from './CategoryField';
import { MerchantAutocompleteField } from './MerchantAutocompleteField';
import { AccountPickerField } from '@/components/accounts';

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

      <CategoryField
        type={values.type}
        value={values.category}
        onChange={(category) => update('category', category)}
        error={errors?.category}
      />

      <MerchantAutocompleteField
        value={values.merchant}
        onChangeText={(merchant) => update('merchant', merchant)}
        error={errors?.merchant}
      />

      <TextField
        label="Nota (opcional)"
        value={values.description}
        onChangeText={(description) => update('description', description)}
        placeholder="Ex: Compras da semana"
        maxLength={200}
      />

      <DatePickerField
        label="Data"
        value={values.date}
        onChange={(date) => update('date', date)}
        error={errors?.date}
      />

      <AccountPickerField
        value={values.accountId}
        onChange={(accountId) => update('accountId', accountId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
