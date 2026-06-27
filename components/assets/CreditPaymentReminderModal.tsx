import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import type { Credit } from '@/lib/domain/types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { spacing } from '@/lib/theme';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

type CreditPaymentReminderModalProps = {
  visible: boolean;
  credit: Credit | null;
  isSaving?: boolean;
  onConfirm: (amount: number) => void;
  onSnooze: () => void;
  onClose: () => void;
};

export function CreditPaymentReminderModal({
  visible,
  credit,
  isSaving = false,
  onConfirm,
  onSnooze,
  onClose,
}: CreditPaymentReminderModalProps) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (visible) {
      setEditing(false);
      setAmount(credit?.nextPaymentAmount ? String(credit.nextPaymentAmount) : '');
    }
  }, [visible, credit?.id]);

  if (!credit) return null;

  const defaultAmount = credit.nextPaymentAmount;
  const parsedAmount = parseGoalAmount(amount);
  const isAmountValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="60%"
      scrollContentStyle={styles.content}
      header={() => (
        <View style={styles.header}>
          <Text variant="h2">Pagamento de crédito</Text>
        </View>
      )}>
      <Text variant="bodyMedium" color="textSecondary">
        O pagamento de «{credit.name}»
        {credit.nextPaymentDate ? ` estava previsto para ${formatDateShort(credit.nextPaymentDate)}` : ' estava previsto para hoje'}
        . O valor foi descontado?
      </Text>

      {editing ? (
        <>
          <TextField
            label="Valor pago (€)"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0,00"
            autoFocus
          />
          <Button
            label={
              isAmountValid ? `Confirmar ${formatCurrency(parsedAmount)}` : 'Confirmar pagamento'
            }
            onPress={() => onConfirm(parsedAmount)}
            loading={isSaving}
            disabled={!isAmountValid || isSaving}
            fullWidth
          />
          <Button
            label="Voltar"
            variant="ghost"
            onPress={() => setEditing(false)}
            disabled={isSaving}
            fullWidth
          />
        </>
      ) : (
        <>
          {defaultAmount ? (
            <Button
              label={`Sim, confirmar ${formatCurrency(defaultAmount)}`}
              onPress={() => onConfirm(defaultAmount)}
              loading={isSaving}
              disabled={isSaving}
              fullWidth
            />
          ) : null}
          <Button
            label="Inserir valor diferente"
            variant="secondary"
            onPress={() => setEditing(true)}
            disabled={isSaving}
            fullWidth
          />
          <Button
            label="Ainda não paguei"
            variant="ghost"
            onPress={onSnooze}
            disabled={isSaving}
            fullWidth
          />
        </>
      )}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.sm,
  },
});
