import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useDeleteSubscription, useSaveSubscription } from '@/hooks/queries/useLiabilities';
import { getApiErrorMessage } from '@/lib/api/errors';
import type { Subscription } from '@/lib/domain/assets.types';
import { parseGoalAmount } from '@/lib/domain/goal-form.utils';
import { colors, spacing } from '@/lib/theme';

type SubscriptionFormModalProps = {
  visible: boolean;
  onClose: () => void;
  subscription?: Subscription | null;
};

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
  const [renewsAt, setRenewsAt] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  const isSaving = saveSubscription.isPending;
  const isDeleting = deleteSubscription.isPending;

  useEffect(() => {
    if (!visible) return;

    if (subscription) {
      setName(subscription.name);
      setAmount(String(subscription.amount));
      setRenewsAt(subscription.renewsAt ?? '');
    } else {
      setName('');
      setAmount('');
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
      setApiError('Valor mensal inválido.');
      return;
    }

    try {
      await saveSubscription.mutateAsync({
        id: subscription?.id,
        name: name.trim(),
        amount: parsedAmount,
        renewsAt: renewsAt.trim() || undefined,
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
        <TextField
          label="Valor mensal"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />
        <TextField
          label="Renova em (opcional)"
          value={renewsAt}
          onChangeText={setRenewsAt}
          placeholder="AAAA-MM-DD"
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
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
