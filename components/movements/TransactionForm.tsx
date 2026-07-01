import { StyleSheet, View } from 'react-native';

import { AccountPickerField } from '@/components/accounts';
import { SegmentedControl } from '@/components/layout';
import { DatePickerField, TextField } from '@/components/ui';
import type { TransactionFormValues } from '@/lib/domain/transaction-form';
import type { CashTransactionType } from '@/lib/domain/transaction.types';
import { defaultBudgetMonthForDate } from '@/lib/domain/transaction-form';
import { spacing } from '@/lib/theme';

import { BudgetMonthField } from './BudgetMonthField';
import { CategoryField } from './CategoryField';

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

  function handleTypeChange(type: CashTransactionType) {
    onChange({
      ...values,
      type,
      category: '',
      budgetMonth: type === 'income' ? defaultBudgetMonthForDate(values.date) : undefined,
    });
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

      <TextField
        label="Descrição (opcional)"
        value={values.description}
        onChangeText={(description) => update('description', description)}
        placeholder="Ex: Jantar com amigos"
        maxLength={200}
      />

      <DatePickerField
        label="Data"
        value={values.date}
        onChange={(date) =>
          onChange({
            ...values,
            date,
            budgetMonth:
              values.type === 'income' ? defaultBudgetMonthForDate(date) : values.budgetMonth,
          })
        }
        error={errors?.date}
      />

      {values.type === 'income' ? (
        <BudgetMonthField
          date={values.date}
          category={values.category}
          value={values.budgetMonth ?? defaultBudgetMonthForDate(values.date)}
          onChange={(budgetMonth) => update('budgetMonth', budgetMonth)}
        />
      ) : null}

      <AccountPickerField
        value={values.accountId}
        onChange={(accountId) => update('accountId', accountId)}
        transactionType={values.type}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.lg,
  },
});
