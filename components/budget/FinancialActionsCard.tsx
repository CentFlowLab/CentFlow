import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import {
  PayCreditCardModal,
  RegisterLoanAmortizationModal,
} from '@/components/assets';
import { CategoryBudgetProgressRow } from '@/components/budget/CategoryBudgetProgressRow';
import { EditCategoryBudgetSheet } from '@/components/budget/EditCategoryBudgetSheet';
import { SavingsMarginBreakdownLines } from '@/components/budget/SavingsMarginBreakdownLines';
import { Button, Card, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useMarkSubscriptionReviewed } from '@/hooks/queries/useMarkSubscriptionReviewed';
import { useSavingsAllocationAction } from '@/hooks/useSavingsAllocationAction';
import { useFinancialActions, type FinancialAction } from '@/hooks/useFinancialActions';
import { useLiabilities } from '@/hooks/queries/useLiabilities';
import type { Credit } from '@/lib/domain/types';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';
import { getApiErrorMessage } from '@/lib/api/errors';

type FinancialActionsCardProps = {
  maxActions?: number;
  title?: string;
  onSuccess?: () => void;
};

export function FinancialActionsCard({
  maxActions = 3,
  title = 'Acções sugeridas',
  onSuccess,
}: FinancialActionsCardProps) {
  const { showToast } = useToast();
  const { actions } = useFinancialActions({ maxActions });
  const { data: liabilities } = useLiabilities();
  const markReviewed = useMarkSubscriptionReviewed();
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [debtCredit, setDebtCredit] = useState<Credit | null>(null);
  const [debtAmount, setDebtAmount] = useState<number | undefined>();
  const [cardPaymentVisible, setCardPaymentVisible] = useState(false);
  const [loanAmortizationVisible, setLoanAmortizationVisible] = useState(false);
  const { confirmAndAllocate, isPending: allocatePending } = useSavingsAllocationAction({
    onSuccess: () => {
      showToast('Valor alocado ao objetivo.', 'success');
      onSuccess?.();
    },
  });

  const editingStatus = useMemo(() => {
    const budgetAction = actions.find(
      (item) => item.kind === 'budget_alert' && item.payload.status.category === editingCategory,
    );
    return budgetAction?.kind === 'budget_alert' ? budgetAction.payload.status : null;
  }, [actions, editingCategory]);

  if (actions.length === 0) return null;

  function openDebtAction(action: Extract<FinancialAction, { kind: 'debt_amortization' }>) {
    const credit = liabilities?.credits.find((item) => item.id === action.payload.creditId);
    if (!credit) {
      showToast('Crédito não encontrado.', 'error');
      return;
    }
    setDebtCredit(credit);
    setDebtAmount(action.payload.amount);
    if (action.payload.isCard) {
      setCardPaymentVisible(true);
    } else {
      setLoanAmortizationVisible(true);
    }
  }

  function closeDebtModals() {
    setCardPaymentVisible(false);
    setLoanAmortizationVisible(false);
    setDebtCredit(null);
    setDebtAmount(undefined);
    onSuccess?.();
  }

  async function handleMarkReviewed(action: Extract<FinancialAction, { kind: 'subscription_review' }>) {
    const subscription = liabilities?.subscriptions.find(
      (item) => item.id === action.payload.subscriptionId,
    );
    if (!subscription) {
      showToast('Subscrição não encontrada.', 'error');
      return;
    }

    try {
      await markReviewed.mutateAsync(subscription);
      showToast(`«${subscription.name}» marcada como revista.`, 'success');
      onSuccess?.();
    } catch (error) {
      showToast(getApiErrorMessage(error, 'a revisão'), 'error');
    }
  }

  async function handleCancelUrl(url: string, name: string) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        showToast('Não foi possível abrir o link de cancelamento.', 'error');
        return;
      }
      await Linking.openURL(url);
      showToast(`A abrir cancelamento de ${name}`, 'success');
    } catch {
      showToast('Não foi possível abrir o link.', 'error');
    }
  }

  function renderAction(action: FinancialAction) {
    switch (action.kind) {
      case 'budget_alert':
        return (
          <View key={action.id} style={styles.actionBlock}>
            <Text variant="bodyMedium">{action.title}</Text>
            <Text variant="caption" color="textMuted">
              {action.description}
            </Text>
            <CategoryBudgetProgressRow
              status={action.payload.status}
              onPress={() => setEditingCategory(action.payload.status.category)}
            />
          </View>
        );

      case 'category_mom':
        return (
          <View key={action.id} style={styles.actionBlock}>
            <Text variant="bodyMedium">{action.title}</Text>
            <Text variant="caption" color="textMuted">
              {action.description}
            </Text>
            <Button
              label="Ver gastos"
              variant="secondary"
              size="md"
              onPress={() => router.push('/(tabs)/analises')}
            />
          </View>
        );

      case 'debt_amortization':
        return (
          <View key={action.id} style={styles.actionBlock}>
            <Text variant="bodyMedium">{action.title}</Text>
            <Text variant="caption" color="textMuted">
              {action.description}
            </Text>
            <SavingsMarginBreakdownLines
              margin={action.payload.margin}
              suggestedAmount={action.payload.amount}
            />
            <Button
              label={`Amortizar ${formatCurrency(action.payload.amount)}`}
              variant="success"
              size="md"
              onPress={() => openDebtAction(action)}
            />
          </View>
        );

      case 'allocate_goal':
        return (
          <View key={action.id} style={styles.actionBlock}>
            <Text variant="bodyMedium">{action.title}</Text>
            <Text variant="caption" color="textMuted">
              {action.description}
            </Text>
            <SavingsMarginBreakdownLines
              margin={action.payload.margin}
              suggestedAmount={action.payload.amount}
            />
            <Button
              label={`Alocar ${formatCurrency(action.payload.amount)} ao objetivo`}
              variant="success"
              size="md"
              loading={allocatePending}
              onPress={() => confirmAndAllocate(action.payload)}
            />
          </View>
        );

      case 'subscription_review':
        return (
          <View key={action.id} style={styles.actionBlock}>
            <Text variant="bodyMedium">{action.title}</Text>
            <Text variant="caption" color="textMuted">
              {action.description}
            </Text>
            <View style={styles.actionButtons}>
              <Button
                label="Marcar como revista"
                variant="secondary"
                size="md"
                loading={markReviewed.isPending}
                onPress={() => void handleMarkReviewed(action)}
                style={styles.flexButton}
              />
              {action.payload.cancelUrl ? (
                <Button
                  label="Cancelar serviço"
                  variant="ghost"
                  size="md"
                  onPress={() =>
                    void handleCancelUrl(action.payload.cancelUrl!, action.payload.subscriptionName)
                  }
                  style={styles.flexButton}
                />
              ) : null}
            </View>
          </View>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <Card variant="elevated" style={styles.card}>
        <View style={styles.header}>
          <Text variant="h3">{title}</Text>
          <Pressable onPress={() => router.push('/(tabs)/analises')} hitSlop={8}>
            <Text variant="caption" color="primary">
              Ver análises
            </Text>
          </Pressable>
        </View>

        <View style={styles.list}>{actions.map(renderAction)}</View>
      </Card>

      <EditCategoryBudgetSheet
        visible={editingStatus !== null}
        status={editingStatus}
        onClose={() => setEditingCategory(null)}
      />

      <PayCreditCardModal
        visible={cardPaymentVisible}
        credit={debtCredit}
        initialAmount={debtAmount}
        onClose={closeDebtModals}
      />
      <RegisterLoanAmortizationModal
        visible={loanAmortizationVisible}
        credit={debtCredit}
        initialAmount={debtAmount}
        onClose={closeDebtModals}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
    borderColor: colors.primary,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  list: {
    gap: spacing.lg,
  },
  actionBlock: {
    gap: spacing.sm,
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  flexButton: {
    flexGrow: 1,
  },
});
