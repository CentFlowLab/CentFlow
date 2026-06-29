import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useCreateAccount, useUpdateAccount } from '@/hooks/queries/useAccounts';
import {
  ACCOUNT_COLOR_OPTIONS,
  ACCOUNT_TYPE_LABELS,
  type AccountType,
  type BankAccount,
  type CreateAccountInput,
} from '@/lib/domain/account.types';
import { colors, radius, spacing } from '@/lib/theme';

type AccountFormModalProps = {
  visible: boolean;
  account?: BankAccount | null;
  onClose: () => void;
};

const TYPE_OPTIONS: AccountType[] = ['checking', 'savings', 'investment', 'wallet'];

export function AccountFormModal({ visible, account, onClose }: AccountFormModalProps) {
  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [initialBalance, setInitialBalance] = useState('0');
  const [color, setColor] = useState<string>(ACCOUNT_COLOR_OPTIONS[0]);

  useEffect(() => {
    if (!visible) return;
    setName(account?.name ?? '');
    setBank(account?.bank ?? '');
    setType(account?.type ?? 'checking');
    setInitialBalance(String(account?.initialBalance ?? 0));
    setColor(account?.color ?? ACCOUNT_COLOR_OPTIONS[0]);
  }, [visible, account]);

  async function handleSave() {
    if (!name.trim()) {
      showToast('Indica o nome da conta.', 'error');
      return;
    }

    const parsedBalance = Number(initialBalance.replace(',', '.')) || 0;
    const input: CreateAccountInput = {
      name: name.trim(),
      type,
      bank: bank.trim() || undefined,
      color,
      icon: type === 'wallet' ? '💳' : '🏦',
      initialBalance: parsedBalance,
    };

    try {
      if (account) {
        await updateMutation.mutateAsync({ id: account.id, input });
        showToast('Conta atualizada.', 'success');
      } else {
        await createMutation.mutateAsync(input);
        showToast('Conta criada.', 'success');
      }
      onClose();
    } catch {
      showToast('Não foi possível guardar a conta.', 'error');
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      header={() => (
        <Text variant="h2">{account ? 'Editar conta' : 'Nova conta'}</Text>
      )}>
      <View style={styles.form}>
        <TextField label="Nome da conta" value={name} onChangeText={setName} placeholder="Conta CGD" />
        <TextField
          label="Banco / instituição (opcional)"
          value={bank}
          onChangeText={setBank}
          placeholder="CGD"
        />

        <Text variant="label" color="textMuted">
          Tipo
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeRow}>
          {TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              style={[styles.typeChip, type === option && styles.typeChipActive]}>
              <Text variant="caption" style={type === option ? styles.typeTextActive : undefined}>
                {ACCOUNT_TYPE_LABELS[option]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <TextField
          label="Saldo inicial (€)"
          value={initialBalance}
          onChangeText={setInitialBalance}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <Text variant="label" color="textMuted">
          Cor
        </Text>
        <View style={styles.colorRow}>
          {ACCOUNT_COLOR_OPTIONS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setColor(option)}
              style={[
                styles.colorDot,
                { backgroundColor: option },
                color === option && styles.colorDotActive,
              ]}
            />
          ))}
        </View>

        <Button
          label={saving ? 'A guardar...' : account ? 'Guardar' : 'Criar conta'}
          onPress={() => void handleSave()}
          loading={saving}
          fullWidth
        />
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  typeRow: {
    gap: spacing.sm,
  },
  typeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeChipActive: {
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
  },
  typeTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: colors.text,
  },
});
