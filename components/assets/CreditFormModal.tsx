import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useDeleteCredit, useSaveCredit } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Credit } from '@/lib/domain/types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';
import {
  DATE_INPUT_PLACEHOLDER,
  formatInputDate,
  inputDateToIso,
} from '@/lib/utils/format';

type CreditFormModalProps = {
  visible: boolean;
  onClose: () => void;
  credit?: Credit | null;
};

export function CreditFormModal({ visible, onClose, credit = null }: CreditFormModalProps) {
  const isEditing = Boolean(credit);
  const saveCredit = useSaveCredit();
  const deleteCredit = useDeleteCredit();

  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [nextAmount, setNextAmount] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = saveCredit.isPending;
  const isDeleting = deleteCredit.isPending;

  useEffect(() => {
    if (!visible) return;

    if (credit) {
      setName(credit.name);
      setBalance(String(credit.outstandingBalance));
      setNextAmount(credit.nextPaymentAmount ? String(credit.nextPaymentAmount) : '');
      setNextDate(formatInputDate(credit.nextPaymentDate));
    } else {
      setName('');
      setBalance('');
      setNextAmount('');
      setNextDate('');
    }

    setApiError(null);
    saveCredit.reset();
    deleteCredit.reset();
  }, [visible, credit?.id]);

  async function handleSave() {
    setApiError(null);

    const outstandingBalance = parseGoalAmount(balance);
    if (!name.trim()) {
      setApiError('Indica o nome do crédito.');
      return;
    }
    if (Number.isNaN(outstandingBalance) || outstandingBalance < 0) {
      setApiError('Saldo em dívida inválido.');
      return;
    }

    const nextPaymentAmount = nextAmount ? parseGoalAmount(nextAmount) : undefined;

    const parsedNextDate = nextDate.trim() ? inputDateToIso(nextDate.trim()) : undefined;
    if (nextDate.trim() && !parsedNextDate) {
      setApiError('Data do próximo pagamento inválida.');
      return;
    }

    try {
      await saveCredit.mutateAsync({
        id: credit?.id,
        name: name.trim(),
        outstandingBalance,
        nextPaymentAmount:
          nextPaymentAmount !== undefined && !Number.isNaN(nextPaymentAmount)
            ? nextPaymentAmount
            : undefined,
        nextPaymentDate: parsedNextDate,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'o crédito'));
    }
  }

  function confirmDelete() {
    if (!credit) return;

    Alert.alert('Eliminar crédito', `Queres remover «${credit.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCredit.mutateAsync(credit.id);
            onClose();
          } catch (error) {
            setApiError(getApiErrorMessage(error, 'o crédito'));
          }
        },
      },
    ]);
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="92%"
      header={(requestClose) => (
        <View style={styles.header}>
          <Text variant="h2">{isEditing ? 'Editar crédito' : 'Novo crédito'}</Text>
          <Pressable onPress={requestClose} hitSlop={12} accessibilityLabel="Fechar">
            <SymbolView
              name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={28}
            />
          </Pressable>
        </View>
      )}>
      <View style={styles.form}>
        <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Crédito automóvel" />
        <TextField
          label="Saldo em dívida"
          value={balance}
          onChangeText={setBalance}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
        <TextField
          label="Próximo pagamento (opcional)"
          value={nextAmount}
          onChangeText={setNextAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
        <TextField
          label="Data do próximo pagamento (opcional)"
          value={nextDate}
          onChangeText={setNextDate}
          placeholder={DATE_INPUT_PLACEHOLDER}
        />

        {apiError ? (
          <Card variant="outlined" style={styles.errorCard}>
            <Text variant="caption" color="danger">
              {apiError}
            </Text>
          </Card>
        ) : null}

        <Button
          label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Adicionar crédito'}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isDeleting}
          fullWidth
        />

        {isEditing ? (
          <Button
            label={isDeleting ? 'A eliminar...' : 'Eliminar crédito'}
            variant="ghost"
            onPress={confirmDelete}
            loading={isDeleting}
            disabled={isSaving || isDeleting}
            fullWidth
          />
        ) : null}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.lg,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
