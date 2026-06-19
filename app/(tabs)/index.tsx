import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  ActionCenterSheet,
  CentFlowScoreCard,
  CentFlowScoreSheet,
  DashboardHeaderLeading,
  DashboardFinancialSnapshot,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAssistantCard,
  HomeGoalHighlightCard,
  HomePersonalizedInsightCard,
  HomeQuickActions,
  type RecommendedQuickAction,
  SuggestionCard,
  NetWorthHeroCard,
} from '@/components/dashboard';
import { AppHeader, QuickAddMenuSheet } from '@/components/layout';
import { AddTransactionModal, TransactionListItem } from '@/components/movements';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
  EmptyState,
} from '@/components/ui';
import { useAnalysisData } from '@/hooks/queries/useAnalysisData';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useCentFlowIntelligence } from '@/hooks/useCentFlowIntelligence';
import { useDiagnosticScreen } from '@/hooks/useDiagnosticScreen';
import { traceMovementStep } from '@/lib/doctor/movement-flow-trace';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import type { AssistantActionId } from '@/lib/domain/financial';
import {
  getContextualNoTransactionsMessage,
  getHomePersonalizedInsight,
  getPersonalizedFallbackSuggestions,
  getRecommendedHomeActions,
} from '@/lib/onboarding/personalization';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  useDiagnosticScreen('home');

  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const { data: analysisData } = useAnalysisData();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [quickAddVisible, setQuickAddVisible] = useState(false);
  const [actionCenterVisible, setActionCenterVisible] = useState(false);
  const [scoreSheetVisible, setScoreSheetVisible] = useState(false);

  const { score, levelProgress, assistant } = useCentFlowIntelligence();

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
        onPress: () => setQuickAddVisible(true),
        accessibilityLabel: 'Adicionar',
      }}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.screen}>
        {header}
        <ScreenContainer>
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
    projection,
    netWorthChangePercent,
    weeklySpending,
    netWorthChangeThisMonth,
    suggestions,
    assetsSummary,
    recentTransactions,
    featuredGoal,
    dataSource,
  } = data;

  const openAddMovement = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: false });
    setStartWithReceiptPicker(false);
    setAddMovementVisible(true);
  };

  const handleQuickAdd = useQuickAddActions({
    onMovement: openAddMovement,
  });

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
      case 'view_plan':
        setActionCenterVisible(true);
        break;
    }
  }

  const openReceiptScanner = () => {
    traceMovementStep('form_open', { component: 'HomeScreen', withReceipt: true });
    setStartWithReceiptPicker(true);
    setAddMovementVisible(true);
  };

  const closeAddMovement = () => {
    setAddMovementVisible(false);
    setStartWithReceiptPicker(false);
  };

  const homeInsight = getHomePersonalizedInsight(onboardingAnswers ?? null, {
    goalsCount: assetsSummary.goalsCount,
    warrantiesCount: assetsSummary.warrantiesCount,
    hasFeaturedGoal: Boolean(featuredGoal),
  });
  const showGoalHighlight = featuredGoal !== null;
  const showInsight = homeInsight && !showGoalHighlight;

  const hasActivity =
    recentTransactions.length > 0 ||
    assetsSummary.goalsCount > 0 ||
    assetsSummary.warrantiesCount > 0 ||
    assetsSummary.inventoryCount > 0;

  const fallbackSuggestions = getPersonalizedFallbackSuggestions(onboardingAnswers ?? null);

  const recommendedRaw = getRecommendedHomeActions(onboardingAnswers ?? null);
  const recommendedActions: RecommendedQuickAction[] = recommendedRaw.map((rec) => {
    if (rec.key === 'receipt') {
      return {
        key: rec.key,
        label: rec.label,
        onPress: openReceiptScanner,
      };
    }
    if (rec.key === 'goal') {
      return {
        key: rec.key,
        label: rec.label,
        onPress: () => router.push('/(tabs)/ativos?action=new-goal'),
      };
    }
    if (rec.key === 'warranty') {
      return {
        key: rec.key,
        label: rec.label,
        onPress: () => router.push('/(tabs)/ativos?action=new-warranty'),
      };
    }
    if (rec.key === 'asset') {
      return {
        key: rec.key,
        label: rec.label,
        onPress: () => router.push('/(tabs)/ativos?action=new-asset'),
      };
    }
    return {
      key: rec.key,
      label: rec.label,
      onPress: openAddMovement,
    };
  });

  const hasGoalRecommendation = recommendedActions.some((action) => action.key === 'goal');

  const noTransactionsMessage = getContextualNoTransactionsMessage(
    onboardingAnswers ?? null,
    'all',
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
          { paddingBottom: Math.max(insets.bottom, spacing['2xl']) },
        ]}>
        <ScreenContainer scrollable={false}>
          {shouldShowDemoBadge(dataSource) ? <DemoModeBadge /> : null}

          <NetWorthHeroCard
            netWorth={netWorth}
            changePercent={netWorthChangePercent}
            monthlyChange={netWorthChangeThisMonth}
            weeklySpending={weeklySpending}
            futureMovementsDelta={projection.futureMovementsDelta}
            hasActivity={hasActivity}
            onAddMovement={openAddMovement}
            onScanReceipt={openReceiptScanner}
          />

          <HomeAssistantCard
            plan={assistant}
            onAction={handleAssistantAction}
            onOpenActionCenter={() => setActionCenterVisible(true)}
          />

          <CentFlowScoreCard
            score={score}
            levelLabel={levelProgress.level.label}
            nextLevelLabel={levelProgress.nextLevel?.label ?? null}
            progressPercent={levelProgress.progressPercent}
            onPress={() => setScoreSheetVisible(true)}
          />

          <DashboardFinancialSnapshot trends={analysisData?.trends ?? null} />

          {showInsight && homeInsight ? (
            <HomePersonalizedInsightCard insight={homeInsight} />
          ) : null}

          {showGoalHighlight && featuredGoal ? (
            <HomeGoalHighlightCard goal={featuredGoal} />
          ) : null}

          <SectionHeader
            title="Últimos movimentos"
            subtitle="Actividade recente"
            actionLabel={recentTransactions.length > 0 ? 'Ver todos' : undefined}
            onAction={
              recentTransactions.length > 0
                ? () => router.push('/(tabs)/movimentos')
                : undefined
            }
          />

          {recentTransactions.length > 0 ? (
            recentTransactions.map((transaction) => (
              <TransactionListItem key={transaction.id} transaction={transaction} />
            ))
          ) : (
            <EmptyState
              compact
              icon={
                <SymbolView
                  name={{
                    ios: 'list.bullet.rectangle',
                    android: 'receipt_long',
                    web: 'receipt_long',
                  }}
                  tintColor={colors.primary}
                  size={28}
                />
              }
              title="Sem movimentos recentes"
              description={noTransactionsMessage}
              actionLabel="Adicionar movimento"
              onAction={openAddMovement}
              secondaryActionLabel="Digitalizar talão"
              onSecondaryAction={openReceiptScanner}
            />
          )}

          <View style={styles.section}>
            <SectionHeader title="O que devo fazer?" subtitle="Sugestões para ti" />
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <SuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))
            ) : (
              fallbackSuggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.id}
                  suggestion={{
                    id: suggestion.id,
                    title: suggestion.title,
                    description: suggestion.description,
                    type: suggestion.type,
                    actionLabel: suggestion.actionLabel,
                  }}
                />
              ))
            )}
          </View>

          <HomeQuickActions
            onAddMovement={() => setActionCenterVisible(true)}
            onViewMovements={() => router.push('/(tabs)/movimentos')}
            onNewGoal={
              !hasGoalRecommendation
                ? () => router.push('/(tabs)/ativos?action=new-goal')
                : undefined
            }
            recommendedActions={recommendedActions}
          />

          <RefetchingIndicator visible={isRefetching} />
        </ScreenContainer>
      </ScrollView>

      <AddTransactionModal
        visible={addMovementVisible}
        onClose={closeAddMovement}
        startWithReceiptPicker={startWithReceiptPicker}
      />

      <QuickAddMenuSheet
        visible={quickAddVisible}
        onClose={() => setQuickAddVisible(false)}
        onSelect={handleQuickAdd}
      />

      <ActionCenterSheet
        visible={actionCenterVisible}
        onClose={() => setActionCenterVisible(false)}
        onSelect={handleAssistantAction}
      />

      <CentFlowScoreSheet
        visible={scoreSheetVisible}
        score={score}
        levelLabel={levelProgress.level.label}
        onClose={() => setScoreSheetVisible(false)}
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
  section: {
    marginBottom: spacing.xl,
  },
});
