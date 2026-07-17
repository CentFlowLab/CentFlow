import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
  ActionCenterSheet,
  DashboardHeaderLeading,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAlertsSection,
  HomeAssetsSummaryCard,
  HomeAssistantCard,
  HomeAttentionSheet,
  HomePersonalizedInsightCard,
  HomePostOnboardingWelcomeCard,
} from '@/components/dashboard';
import { MonthlySpendableCard, MonthlySpendableSheet, FinancialActionsCard } from '@/components/budget';
import { RecommendationsCard } from '@/components/dashboard';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { AddTransactionModal } from '@/components/movements';
import { ErrorState, RefetchingIndicator, ScreenContainer } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import type { AssistantActionId } from '@/lib/domain/financial';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import {
  getHomeAssetsSummaryHints,
  getHomePersonalizedInsight,
  getHomeSectionOrder,
  type HomeSectionId,
} from '@/lib/onboarding/personalization';
import { mergeHomeSuggestions } from '@/lib/onboarding/suggestions-bridge';
import { appHref } from '@/lib/navigation/href';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  useDiagnosticScreen('home');

  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: profile } = useProfile();
  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [attentionSheetVisible, setAttentionSheetVisible] = useState(false);
  const [spendableVisible, setSpendableVisible] = useState(false);
  const [actionCenterVisible, setActionCenterVisible] = useState(false);

  const { assistant } = useCentFlowIntelligence();
  const { contentBottomPadding } = useResponsiveLayout();

  const openAddMovement = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: false });
    setStartWithReceiptPicker(false);
    setAddMovementVisible(true);
  };

  const openReceiptScanner = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: true });
    setStartWithReceiptPicker(true);
    setAddMovementVisible(true);
  };

  const closeAddMovement = () => {
    setAddMovementVisible(false);
    setStartWithReceiptPicker(false);
  };

  const quickAdd = useContextualQuickAdd(
    'home',
    {
      onMovement: openAddMovement,
      onReceipt: openReceiptScanner,
      onAsset: () => router.push('/(tabs)/ativos?action=new-asset'),
      onGoal: () => router.push('/(tabs)/ativos?action=new-goal'),
      onCredit: () => router.push(appHref('creditosNew')),
    },
    onboardingAnswers,
  );

  function handleAssistantAction(actionId: AssistantActionId) {
    switch (actionId) {
      case 'add_expense':
        openAddMovement();
        break;
      case 'scan_receipt':
        openReceiptScanner();
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

  const header = (
    <AppHeader
      leading={<DashboardHeaderLeading />}
      showBrand={false}
      action={{
        icon: (
          <SymbolView
            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
            tintColor={colors.primary}
            size={26}
          />
        ),
        onPress: quickAdd.handlePress,
        accessibilityLabel: quickAdd.accessibilityLabel,
      }}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {header}
        <ScreenContainer applyBottomSafeInset={false}>
          <DashboardSkeleton />
        </ScreenContainer>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.centered}>
          <ErrorState
            context="dashboard"
            error={error}
            onRetry={() => refetch()}
            retryLoading={isRefetching}
          />
        </View>
      </View>
    );
  }

  const {
    netWorth,
    assetsSummary,
    dataSource,
    attentionItems,
    suggestions,
    recentTransactions,
  } = data;

  const hasActivity =
    recentTransactions.length > 0 ||
    netWorth.netWorth !== 0 ||
    assetsSummary.goalsCount > 0 ||
    assetsSummary.warrantiesCount > 0 ||
    assetsSummary.inventoryCount > 0;

  const assetsHints = getHomeAssetsSummaryHints(onboardingAnswers ?? null);
  const sectionOrder = getHomeSectionOrder(onboardingAnswers ?? null);
  const mergedSuggestions = mergeHomeSuggestions(suggestions, onboardingAnswers);
  const personalizedInsight = getHomePersonalizedInsight(onboardingAnswers ?? null, {
    goalsCount: assetsSummary.goalsCount,
    warrantiesCount: assetsSummary.warrantiesCount,
    hasFeaturedGoal: assetsSummary.goalsCount > 0,
  });
  const firstName = profile?.name?.split(' ')[0] ?? '';

  const homeSections: Record<HomeSectionId, ReactNode> = {
    spendable: (
      <>
        <MonthlySpendableCard key="spendable" onOpenDetails={() => setSpendableVisible(true)} />
        <FinancialActionsCard key="financial-actions" maxActions={1} />
        <RecommendationsCard key="recommendations" maxVisible={1} />
      </>
    ),
    assets: hasActivity ? (
      <HomeAssetsSummaryCard key="assets" summary={assetsSummary} hints={assetsHints} />
    ) : null,
    alerts: (
      <HomeAlertsSection
        key="alerts"
        attentionItems={attentionItems}
        suggestions={mergedSuggestions}
        onOpenAllAttention={() => setAttentionSheetVisible(true)}
      />
    ),
    /** Assistente só com insights concretos — evita cartão genérico. */
    assistant:
      assistant.insights.length > 0 ? (
        <HomeAssistantCard
          key="assistant"
          plan={assistant}
          onAction={handleAssistantAction}
          onOpenActionCenter={() => setActionCenterVisible(true)}
        />
      ) : null,
  };

  return (
    <View style={styles.screen}>
      {header}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: contentBottomPadding },
        ]}>
        <ScreenContainer scrollable={false} applyBottomSafeInset={false}>
          {shouldShowDemoBadge(dataSource) ? <DemoModeBadge /> : null}

          {onboardingAnswers?.completed ? (
            <HomePostOnboardingWelcomeCard answers={onboardingAnswers} firstName={firstName} />
          ) : null}

          {personalizedInsight ? (
            <HomePersonalizedInsightCard insight={personalizedInsight} />
          ) : null}

          {sectionOrder.map((sectionId) => homeSections[sectionId])}

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      </ScrollView>

      <AddTransactionModal
        visible={addMovementVisible}
        onClose={closeAddMovement}
        startWithReceiptPicker={startWithReceiptPicker}
      />

      <QuickAddMenuSheet
        visible={quickAdd.sheetVisible}
        onClose={() => quickAdd.setSheetVisible(false)}
        onSelect={quickAdd.onSelect}
        actions={quickAdd.actions}
      />

      <HomeAttentionSheet
        visible={attentionSheetVisible}
        onClose={() => setAttentionSheetVisible(false)}
        items={attentionItems}
      />

      <MonthlySpendableSheet
        visible={spendableVisible}
        onClose={() => setSpendableVisible(false)}
      />

      <ActionCenterSheet
        visible={actionCenterVisible}
        onClose={() => setActionCenterVisible(false)}
        onSelect={(actionId) => {
          setActionCenterVisible(false);
          handleAssistantAction(actionId);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
});
