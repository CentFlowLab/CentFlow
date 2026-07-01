import { SymbolView } from 'expo-symbols';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, DatePickerField, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useDeleteSubscription, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import { formFieldsDiffer, formHasAnyText } from '@/lib/forms';
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
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [billingInterval, setBillingInterval] = useState<SubscriptionBillingInterval>('monthly');
  const [renewsAt, setRenewsAt] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = saveSubscription.isPending;
  const isDeleting = deleteSubscription.isPending;

  const baselineRef = useRef({
    name: '',
    amount: '',
    renewsAt: '',
    billingInterval: 'monthly' as SubscriptionBillingInterval,
  });

  useEffect(() => {
    if (!visible) return;

    if (subscription) {
      const next = {
        name: subscription.name,
        amount: String(subscription.amount),
        billingInterval: subscription.billingInterval ?? 'monthly',
        renewsAt: formatInputDate(subscription.renewsAt),
      };
      setName(next.name);
      setAmount(next.amount);
      setBillingInterval(next.billingInterval);
      setRenewsAt(next.renewsAt);
      baselineRef.current = next;
    } else {
      const empty = {
        name: '',
        amount: '',
        billingInterval: 'monthly' as SubscriptionBillingInterval,
        renewsAt: '',
      };
      setName(empty.name);
      setAmount(empty.amount);
      setBillingInterval(empty.billingInterval);
      setRenewsAt(empty.renewsAt);
      baselineRef.current = empty;
    }

    setApiError(null);
    saveSubscription.reset();
    deleteSubscription.reset();
  }, [visible, subscription?.id]);

  const isDirty = useMemo(() => {
    if (!visible) return false;

    const baseline = baselineRef.current;

    if (subscription) {
      return (
        formFieldsDiffer({ name, amount, renewsAt }, baseline) ||
        billingInterval !== baseline.billingInterval
      );
    }

    return formHasAnyText(name, amount, renewsAt);
  }, [visible, subscription, name, amount, renewsAt, billingInterval]);

  async function handleSave() {
    setApiError(null);

    const parsedAmount = parseGoalAmount(amount);
    if (!name.trim()) {
      setApiError('Indica o nome da despesa recorrente.');
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
      showToast(isEditing ? 'Despesa recorrente actualizada.' : 'Despesa recorrente adicionada.', 'success');
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a despesa recorrente'));
      showToast('Não conseguimos guardar esta despesa recorrente. Tenta novamente.', 'error');
    }
  }

  function confirmDelete() {
    if (!subscription) return;

    Alert.alert('Eliminar despesa recorrente', `Queres remover «${subscription.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteSubscription.mutateAsync(subscription.id);
            onClose();
          } catch (error) {
            setApiError(getApiErrorMessage(error, 'a despesa recorrente'));
          }
        },
      },
    ]);
  }

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      isDirty={isDirty}
      maxHeight="92%"
      scrollContentStyle={styles.form}
      header={(requestClose) => (
        <View style={styles.header}>
          <Text variant="h2">{isEditing ? 'Editar despesa recorrente' : 'Nova despesa recorrente'}</Text>
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
          label={isSaving ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Adicionar despesa recorrente'}
          onPress={handleSave}
          loading={isSaving}
          disabled={isSaving || isDeleting}
          fullWidth
        />

        {isEditing ? (
          <Button
            label={isDeleting ? 'A eliminar...' : 'Eliminar despesa recorrente'}
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
