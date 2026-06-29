import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { type ReactNode, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import {
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
import { MonthlySpendableCard, MonthlySpendableSheet } from '@/components/budget';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { AddTransactionModal, QuickExpenseSheet } from '@/components/movements';
import { ErrorState, RefetchingIndicator, ScreenContainer, Text } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useProfile } from '@/hooks/queries/useProfile';
import { useContextualQuickAdd } from '@/hooks/useContextualQuickAdd';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { useAccountsWithBalances } from '@/hooks/queries/useAccounts';
import { useTransactions } from '@/hooks/queries/useTransactions';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import type { AssistantActionId } from '@/lib/domain/financial';
import type { HomeScreenData } from '@/lib/domain/home.types';
import type { Suggestion } from '@/lib/domain/types';
import type { OnboardingAnswers } from '@/lib/onboarding/types';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import {
  getHomeAssetsSummaryHints,
  getHomePersonalizedInsight,
  getHomeSectionOrder,
  type HomeSectionId,
} from '@/lib/onboarding/personalization';
import { mergeHomeSuggestions } from '@/lib/onboarding/suggestions-bridge';
import { resolveSuggestionAction } from '@/lib/navigation/suggestion-actions';
import { colors, radius, spacing } from '@/lib/theme';

type HomeScreenContentProps = {
  data: HomeScreenData;
  onboardingAnswers: OnboardingAnswers | null | undefined;
  firstName: string;
  isRefetching: boolean;
  refetch: () => void;
};

function LiabilitiesLoadFailedBanner() {
  return (
    <View style={styles.liabilitiesBanner}>
      <Text variant="caption" color="warning">
        Não foi possível carregar créditos — o património pode estar incompleto.
      </Text>
    </View>
  );
}

function HomeScreenContent({
  data,
  onboardingAnswers,
  firstName,
  isRefetching,
  refetch,
}: HomeScreenContentProps) {
  const { assistant } = useCentFlowIntelligence();
  const { data: allTransactions = [] } = useTransactions('all');
  const { totalBalance: accountsTotal } = useAccountsWithBalances(allTransactions);
  const { contentBottomPadding } = useResponsiveLayout();

  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [quickExpenseVisible, setQuickExpenseVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [attentionSheetVisible, setAttentionSheetVisible] = useState(false);
  const [spendableVisible, setSpendableVisible] = useState(false);

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
      onQuickExpense: () => setQuickExpenseVisible(true),
      onMovement: openAddMovement,
      onReceipt: openReceiptScanner,
      onAsset: () => router.push('/(tabs)/ativos?action=new-asset'),
      onGoal: () => router.push('/(tabs)/ativos?action=new-goal'),
      onCredit: () => router.push('/(tabs)/precos?action=new-credit'),
    },
    onboardingAnswers,
  );

  function handleSuggestionPress(suggestion: Suggestion) {
    const action = resolveSuggestionAction(suggestion);
    switch (action) {
      case 'scan_receipt':
        openReceiptScanner();
        break;
      case 'add_movement':
        openAddMovement();
        break;
      case 'open_movimentos':
        router.push('/(tabs)/movimentos?view=movimentos');
        break;
      case 'open_recorrentes':
        router.push('/(tabs)/movimentos?view=subscricoes');
        break;
      case 'open_ativos_goals':
        router.push('/(tabs)/ativos?tab=objetivos');
        break;
      case 'open_ativos_inventory':
        router.push('/(tabs)/ativos?tab=inventario');
        break;
      case 'open_analises':
        router.push('/(tabs)/analises');
        break;
      case 'open_analises_gastos':
        router.push('/(tabs)/analises?tab=gastos&period=week');
        break;
      default:
        break;
    }
  }

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

  const {
    assetsSummary,
    dataSource,
    attentionItems,
    suggestions,
    recentTransactions,
    liabilitiesLoadFailed,
  } = data;

  const showWelcomeCard =
    onboardingAnswers?.completed &&
    recentTransactions.length === 0 &&
    attentionItems.length === 0;

  const assetsHints = getHomeAssetsSummaryHints(onboardingAnswers ?? null);
  const sectionOrder = getHomeSectionOrder(onboardingAnswers ?? null);
  const mergedSuggestions = mergeHomeSuggestions(suggestions, onboardingAnswers);
  const personalizedInsight = getHomePersonalizedInsight(onboardingAnswers ?? null, {
    goalsCount: assetsSummary.goalsCount,
    warrantiesCount: assetsSummary.warrantiesCount,
    hasFeaturedGoal: assetsSummary.goalsCount > 0,
  });

  const homeSections: Record<HomeSectionId, ReactNode> = {
    spendable: (
      <MonthlySpendableCard key="spendable" onOpenDetails={() => setSpendableVisible(true)} />
    ),
    assets: (
      <HomeAssetsSummaryCard
        key="assets"
        summary={{ ...assetsSummary, accountsTotal }}
        hints={assetsHints}
      />
    ),
    alerts: (
      <HomeAlertsSection
        key="alerts"
        attentionItems={attentionItems}
        suggestions={mergedSuggestions}
        onOpenAllAttention={() => setAttentionSheetVisible(true)}
        onSuggestionPress={handleSuggestionPress}
      />
    ),
    assistant: (
      <HomeAssistantCard
        key="assistant"
        plan={assistant}
        onAction={handleAssistantAction}
        onOpenFullPlan={() => router.push('/financial-plan')}
      />
    ),
  };

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

          {liabilitiesLoadFailed ? <LiabilitiesLoadFailedBanner /> : null}

          {showWelcomeCard ? (
            <HomePostOnboardingWelcomeCard answers={onboardingAnswers!} firstName={firstName} />
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

      <QuickExpenseSheet
        visible={quickExpenseVisible}
        onClose={() => setQuickExpenseVisible(false)}
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
    </View>
  );
}

export default function InicioScreen() {
  useDiagnosticScreen('home');

  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const { data: onboardingAnswers } = useOnboardingAnswers();
  const { data: profile } = useProfile();

  const firstName = profile?.name?.split(' ')[0] ?? '';

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
        onPress: () => {},
        accessibilityLabel: 'Adicionar',
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

  return (
    <HomeScreenContent
      data={data}
      onboardingAnswers={onboardingAnswers}
      firstName={firstName}
      isRefetching={isRefetching}
      refetch={refetch}
    />
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
  liabilitiesBanner: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(251, 191, 36, 0.14)',
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.md,
  },
});
