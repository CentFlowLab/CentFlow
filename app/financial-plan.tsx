import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { HomeAssistantCard } from '@/components/dashboard';
import { MonthlySpendableCard } from '@/components/budget';
import { AppHeader } from '@/components/layout';
import { ScreenContainer, Text } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useAssets } from '@/hooks/queries/useAssets';
import type { AssistantActionId } from '@/lib/domain/financial';
import { colors, spacing } from '@/lib/theme';
import { formatCurrency } from '@/lib/utils/format';

export default function FinancialPlanScreen() {
  const { assistant } = useCentFlowIntelligence();
  const { data: answers } = useOnboardingAnswers();
  const { data: assets } = useAssets();
  const { contentBottomPadding } = useResponsiveLayout();

  const goals = assets?.goals ?? [];
  const savingsGoal = answers?.savingsGoal;

  function handleAssistantAction(actionId: AssistantActionId) {
    switch (actionId) {
      case 'add_expense':
        router.push('/(tabs)/movimentos?action=new-movement');
        break;
      case 'scan_receipt':
        router.push('/(tabs)/movimentos?action=receipt');
        break;
      case 'create_goal':
        router.push('/(tabs)/ativos?action=new-goal');
        break;
      case 'add_subscription':
        router.push('/(tabs)/movimentos?view=subscricoes&action=new-subscription');
        break;
      case 'review_subscriptions':
        router.push('/(tabs)/movimentos?view=subscricoes');
        break;
      case 'view_warranties':
        router.push('/(tabs)/ativos?tab=garantias');
        break;
      default:
        break;
    }
  }

  return (
    <View style={styles.screen}>
      <AppHeader
        variant="detail"
        title="Plano financeiro"
        subtitle="Visão do mês e próximos passos"
        showBack
        showAvatar={false}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: contentBottomPadding }]}
        showsVerticalScrollIndicator={false}>
        <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
          <MonthlySpendableCard onOpenDetails={() => {}} />

          {savingsGoal && savingsGoal > 0 ? (
            <View style={styles.goalBlock}>
              <Text variant="label" color="textMuted">
                Objetivo de poupança
              </Text>
              <Text variant="h3">{formatCurrency(savingsGoal)}</Text>
              {goals.length > 0 ? (
                <Text variant="caption" color="textSecondary">
                  {goals.length} {goals.length === 1 ? 'objetivo activo' : 'objetivos activos'}
                </Text>
              ) : null}
            </View>
          ) : null}

          <HomeAssistantCard
            plan={assistant}
            onAction={handleAssistantAction}
            onOpenFullPlan={() => {}}
            showFullPlanLink={false}
          />
        </ScreenContainer>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    paddingTop: spacing.sm,
  },
  goalBlock: {
    gap: spacing.xs,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
