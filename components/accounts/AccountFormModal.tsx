import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Button, Text, TextField } from '@/components/ui';
import { useDeleteAccount, useSaveAccount } from '@/hooks/queries/useAccounts';
import { getApiErrorMessage } from '@/lib/api/errors';
import {
  ACCOUNT_TYPE_OPTIONS,
  type AccountType,
  type BankAccount,
} from '@/lib/domain/account.types';
import { defaultBudgetEnabledForType } from '@/lib/domain/financial/budget-accounts';
import { formHasAnyText } from '@/lib/forms';
import { colors, radius, spacing } from '@/lib/theme';

type AccountFormModalProps = {
  visible: boolean;
  onClose: () => void;
  account?: BankAccount | null;
};

export function AccountFormModal({ visible, onClose, account = null }: AccountFormModalProps) {
  const isEditing = Boolean(account);
  const saveAccount = useSaveAccount();
  const deleteAccount = useDeleteAccount();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [institution, setInstitution] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [budgetEnabled, setBudgetEnabled] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const baselineRef = useRef({
    name: '',
    type: 'checking' as AccountType,
    institution: '',
    initialBalance: '',
    isActive: true,
    budgetEnabled: true,
  });

  useEffect(() => {
    if (!visible) return;

    if (account) {
      const next = {
        name: account.name,
        type: account.type,
        institution: account.institution ?? '',
        initialBalance: String(account.initialBalance),
        isActive: account.isActive,
        budgetEnabled: account.budgetEnabled ?? defaultBudgetEnabledForType(account.type),
      };
      setName(next.name);
      setType(next.type);
      setInstitution(next.institution);
      setInitialBalance(next.initialBalance);
      setIsActive(next.isActive);
      setBudgetEnabled(next.budgetEnabled);
      baselineRef.current = next;
    } else {
      const empty = {
        name: '',
        type: 'checking' as AccountType,
        institution: '',
        initialBalance: '',
        isActive: true,
        budgetEnabled: true,
      };
      setName(empty.name);
      setType(empty.type);
      setInstitution(empty.institution);
      setInitialBalance(empty.initialBalance);
      setIsActive(empty.isActive);
      setBudgetEnabled(empty.budgetEnabled);
      baselineRef.current = empty;
    }

    setApiError(null);
    saveAccount.reset();
    deleteAccount.reset();
  }, [visible, account?.id]);

  const isDirty = useMemo(() => {
    if (!visible) return false;
    if (account) {
      return (
        name !== baselineRef.current.name ||
        type !== baselineRef.current.type ||
        institution !== baselineRef.current.institution ||
        initialBalance !== baselineRef.current.initialBalance ||
        isActive !== baselineRef.current.isActive ||
        budgetEnabled !== baselineRef.current.budgetEnabled
      );
    }
    return formHasAnyText(name, institution, initialBalance);
  }, [visible, account, name, type, institution, initialBalance, isActive, budgetEnabled]);

  function handleTypeChange(nextType: AccountType) {
    setType(nextType);
    setBudgetEnabled(defaultBudgetEnabledForType(nextType));
  }

  async function handleSave() {
    if (!name.trim()) {
      setApiError('Indica o nome da conta.');
      return;
    }

    const balanceValue = Number.parseFloat(initialBalance.replace(',', '.'));
    if (!Number.isFinite(balanceValue)) {
      setApiError('Saldo inicial inválido.');
      return;
    }

    try {
      await saveAccount.mutateAsync({
        id: account?.id,
        name: name.trim(),
        type,
        institution: institution.trim() || undefined,
        initialBalance: balanceValue,
        isActive,
        budgetEnabled,
        currency: account?.currency ?? 'EUR',
      });
      onClose();
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'a conta'));
    }
  }

  function handleDelete() {
    if (!account) return;
    Alert.alert('Eliminar conta', `Queres remover «${account.name}»?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAccount.mutateAsync(account.id);
            onClose();
          } catch (error) {
            setApiError(getApiErrorMessage(error, 'a conta'));
          }
        },
      },
    ]);
  }

  return (
    <DraggableBottomSheet visible={visible} onClose={onClose} isDirty={isDirty}>
      <View style={styles.container}>
        <Text variant="h2">{isEditing ? 'Editar conta' : 'Nova conta'}</Text>

        <TextField label="Nome" value={name} onChangeText={setName} placeholder="Ex.: Conta principal" />

        <Text variant="label" color="textSecondary">
          Tipo
        </Text>
        <View style={styles.typeRow}>
          {ACCOUNT_TYPE_OPTIONS.map((option) => {
            const active = option.key === type;
            return (
              <Pressable
                key={option.key}
                onPress={() => handleTypeChange(option.key)}
                style={[styles.typeChip, active && styles.typeChipActive]}>
                <Text variant="caption" style={active ? styles.typeChipTextActive : undefined}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextField
          label="Banco / instituição (opcional)"
          value={institution}
          onChangeText={setInstitution}
          placeholder="Ex.: CGD, Revolut, Moey"
        />

        <TextField
          label="Saldo inicial"
          value={initialBalance}
          onChangeText={setInitialBalance}
          keyboardType="decimal-pad"
          placeholder="0,00"
        />

        <Pressable
          onPress={() => setBudgetEnabled((value) => !value)}
          style={styles.activeRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: budgetEnabled }}>
          <View style={styles.budgetToggleCopy}>
            <Text variant="body">Usar no orçamento mensal</Text>
            <Text variant="caption" color="textMuted">
              Só activa para contas que usas para pagar despesas do mês.
            </Text>
            {type === 'investment' && !budgetEnabled ? (
              <Text variant="caption" color="textMuted">
                Investimentos contam no património, mas não no dinheiro disponível para gastar.
              </Text>
            ) : null}
          </View>
          <Text variant="caption" color={budgetEnabled ? 'success' : 'textMuted'}>
            {budgetEnabled ? 'Sim' : 'Não'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setIsActive((value) => !value)}
          style={styles.activeRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: isActive }}>
          <Text variant="body">Conta activa</Text>
          <Text variant="caption" color={isActive ? 'success' : 'textMuted'}>
            {isActive ? 'Sim' : 'Não'}
          </Text>
        </Pressable>

        {apiError ? (
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        ) : null}

        <Button
          label={saveAccount.isPending ? 'A guardar...' : isEditing ? 'Guardar alterações' : 'Adicionar conta'}
          onPress={handleSave}
          disabled={saveAccount.isPending}
        />

        {isEditing ? (
          <Button
            label={deleteAccount.isPending ? 'A eliminar...' : 'Eliminar conta'}
            variant="ghost"
            onPress={handleDelete}
            disabled={deleteAccount.isPending}
          />
        ) : null}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  typeChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  budgetToggleCopy: {
    flex: 1,
    gap: spacing.xs,
  },
});
