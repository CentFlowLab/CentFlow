import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useDeleteSubscription, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Subscription, SubscriptionBillingInterval } from '@/lib/domain/assets.types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';
import { formatInputDate, inputDateToIso } from '@/lib/utils/format';

type SubscriptionFormModalProps = {
  visible: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
};

const INTERVALS: Array<{ key: SubscriptionBillingInterval; label: string }> = [
  { key: 'monthly', label: 'Mensal' },
  { key: 'quarterly', label: 'Trimestral' },
  { key: 'annual', label: 'Anual' },
];

export function SubscriptionFormModal({
  visible,
  onClose,
  subscription = null,
}: SubscriptionFormModalProps) {
  const isEditing = Boolean(subscription);
  const saveSubscription = useSaveSubscription();
  const deleteSubscription = useDeleteSubscription();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingInterval, setBillingInterval] = useState<SubscriptionBillingInterval>('monthly');
  const [renewsAt, setRenewsAt] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = saveSubscription.isPending;
  const isDeleting = deleteSubscription.isPending;

  useEffect(() => {
    if (!visible) return;

    if (subscription) {
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setBillingInterval(subscription.billingInterval ?? 'monthly');
      setRenewsAt(formatInputDate(subscription.renewsAt));
    } else {
      setName('');
      setAmount('');
      setBillingInterval('monthly');
      setRenewsAt('');
    }

    setApiError(null);
    saveSubscription.reset();
    deleteSubscription.reset();
  }, [visible, subscription?.id]);

  async function handleSave() {
    setApiError(null);

    const parsedAmount = parseGoalAmount(amount);
    if (!name.trim()) {
      setApiError('Indica o nome da subscrição.');
      return;
    }
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setApiError('Valor inválido.');
      return;
    }

    const parsedRenewsAt = renewsAt.trim() ? inputDateToIso(renewsAt.trim()) : undefined;
    if (renewsAt.trim() && !parsedRenewsAt) {
      setApiError('Data de renovação inválida.');
      return;
    }

    try {
      await saveSubscription.mutateAsync({
        id: subscription?.id,
        name: name.trim(),
        amount: parsedAmount,
        billingInterval,
        renewsAt: parsedRenewsAt,
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a subscrição'));
    }
  }

  function confirmDelete() {
    if (!subscription) return;

    Alert.alert('Eliminar subscrição', `Queres remover «${subscription.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscription.mutateAsync(subscription.id);
            onClose();
          } catch (error) {
            setApiError(getApiErrorMessage(error, 'a subscrição'));
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
          <Text variant="h2">{isEditing ? 'Editar subscrição' : 'Nova subscrição'}</Text>
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
        <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Netflix" />
        <Text variant="label" color="textMuted">
          Periodicidade
        </Text>
        <View style={styles.intervalRow}>
          {INTERVALS.map((interval) => (
            <Pressable
              key={interval.key}
              onPress={() => setBillingInterval(interval.key)}
              style={[
                styles.intervalChip,
                billingInterval === interval.key && styles.intervalChipActive,
              ]}>
              <Text
                variant="caption"
                color={billingInterval === interval.key ? 'primary' : 'textMuted'}>
                {interval.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextField
          label={`Valor ${billingInterval === 'monthly' ? 'mensal' : billingInterval === 'quarterly' ? 'trimestral' : 'anual'}`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
        <DatePickerField
          label="Renova em (opcional)"
          value={renewsAt}
          onChange={setRenewsAt}
        />

        {apiError ? (
          <Card variant="outlined" style={styles.errorCard}>
            <Text variant="caption" color="danger">
              {apiError}
            </Text>
          </Card>
        ) : null}

        <Button
          label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Adicionar subscrição'}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isDeleting}
          fullWidth
        />

        {isEditing ? (
          <Button
            label={isDeleting ? 'A eliminar...' : 'Eliminar subscrição'}
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
  intervalRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  intervalChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  intervalChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
