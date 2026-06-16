import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DashboardHeaderLeading,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAssetsSummaryCard,
  HomeAttentionSheet,
  HomeChangesSheet,
  HomeGoalHighlightCard,
  HomeIntroOverlay,
  HomePersonalizedInsightCard,
  HomeQuickActions,
  HomeStoriesRow,
  type HomeStoryId,
  type RecommendedQuickAction,
  SuggestionCard,
  NetWorthHeroCard,
} from '@/components/dashboard';
import { AppHeader } from '@/components/layout';
import { AddTransactionModal, TransactionListItem } from '@/components/movements';
import { FinancialProfileDetailSheet } from '@/components/profile';
import {
  ErrorState,
  RefetchingIndicator,
  ScreenContainer,
  SectionHeader,
  Text,
} from '@/components/ui';
import { useHomeScreenData } from '@/hooks/queries/useHomeScreenData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { useOnboardingAnswers } from '@/hooks/queries/useOnboardingAnswers';
import { useHomeStoryNotifications } from '@/hooks/useHomeStoryNotifications';
import {
  getContextualNoTransactionsMessage,
  getHomeAssetsSummaryHints,
  getHomePersonalizedInsight,
  getPersonalizedFallbackSuggestions,
  getRecommendedHomeActions,
  shouldPrioritizeGoals,
} from '@/lib/onboarding/personalization';
import { shouldShowDemoBadge } from '@/lib/config/demo-mode';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const { data: financialProfile } = useFinancialProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  const profileScore = financialProfile?.score ?? 0;
  const profilePendingCount = financialProfile?.pendingDimensions.length ?? 0;
  const weeklySpendingPreview = data?.weeklySpending ?? 0;
  const netWorthChangePreview = data?.netWorthChangeThisMonth ?? 0;
  const personalInflationPreview = data?.personalInflation ?? null;
  const attentionIdsPreview = data?.attentionItems.map((item) => item.id) ?? [];

  const { hasUnread, markStorySeen } = useHomeStoryNotifications({
    profileScore,
    profilePendingCount,
    weeklySpending: weeklySpendingPreview,
    netWorthChangeThisMonth: netWorthChangePreview,
    personalInflation: personalInflationPreview,
    attentionIds: attentionIdsPreview,
  });

  const [profileDetailVisible, setProfileDetailVisible] = useState(false);
  const [changesSheetVisible, setChangesSheetVisible] = useState(false);
  const [attentionSheetVisible, setAttentionSheetVisible] = useState(false);
  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);
  const [introDone, setIntroDone] = useState(false);

  const handleStoryPress = useCallback(
    (id: HomeStoryId) => {
      if (id === 'profile') {
        setProfileDetailVisible(true);
        void markStorySeen('profile');
        return;
      }
      if (id === 'changes') {
        setChangesSheetVisible(true);
        void markStorySeen('changes');
        return;
      }
      setAttentionSheetVisible(true);
      void markStorySeen('attention');
    },
    [markStorySeen],
  );

  const header = <AppHeader leading={<DashboardHeaderLeading />} showBrand={false} />;

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
    netWorthChangePercent,
    weeklySpending,
    netWorthChangeThisMonth,
    personalInflation,
    attentionItems,
    suggestions,
    assetsSummary,
    recentTransactions,
    featuredGoal,
    dataSource,
  } = data;

  const openAddMovement = () => {
    setStartWithReceiptPicker(false);
    setAddMovementVisible(true);
  };

  const openReceiptScanner = () => {
    setStartWithReceiptPicker(true);
    setAddMovementVisible(true);
  };

  const closeAddMovement = () => {
    setAddMovementVisible(false);
    setStartWithReceiptPicker(false);
  };

  const assetsHints = getHomeAssetsSummaryHints(onboardingAnswers ?? null);
  const homeInsight = getHomePersonalizedInsight(onboardingAnswers ?? null, {
    goalsCount: assetsSummary.goalsCount,
    warrantiesCount: assetsSummary.warrantiesCount,
    hasFeaturedGoal: Boolean(featuredGoal),
  });
  const showGoalHighlight =
    shouldPrioritizeGoals(onboardingAnswers ?? null) && featuredGoal !== null;
  const showInsight = homeInsight && !showGoalHighlight;

  const fallbackSuggestions = getPersonalizedFallbackSuggestions(onboardingAnswers ?? null);

  const closeProfileSheet = () => {
    setProfileDetailVisible(false);
    void markStorySeen('profile');
  };

  const closeChangesSheet = () => {
    setChangesSheetVisible(false);
    void markStorySeen('changes');
  };

  const closeAttentionSheet = () => {
    setAttentionSheetVisible(false);
    void markStorySeen('attention');
  };

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
          <HomeStoriesRow unread={hasUnread} onStoryPress={handleStoryPress} />

          {shouldShowDemoBadge(dataSource) ? <DemoModeBadge /> : null}

          <NetWorthHeroCard netWorth={netWorth} changePercent={netWorthChangePercent} />

          {showGoalHighlight && featuredGoal ? (
            <HomeGoalHighlightCard goal={featuredGoal} />
          ) : null}

          {showInsight && homeInsight ? (
            <HomePersonalizedInsightCard insight={homeInsight} />
          ) : null}

          <HomeAssetsSummaryCard summary={assetsSummary} hints={assetsHints} />

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
            <View style={styles.emptyTransactions}>
              <Text variant="body" color="textSecondary" align="center">
                {noTransactionsMessage}
              </Text>
            </View>
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
            onAddMovement={openAddMovement}
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

      {!introDone ? <HomeIntroOverlay onComplete={() => setIntroDone(true)} /> : null}

      <FinancialProfileDetailSheet
        visible={profileDetailVisible}
        profile={financialProfile}
        onClose={closeProfileSheet}
      />

      <HomeChangesSheet
        visible={changesSheetVisible}
        onClose={closeChangesSheet}
        weeklySpending={weeklySpending}
        netWorthChangeThisMonth={netWorthChangeThisMonth}
        personalInflation={personalInflation}
      />

      <HomeAttentionSheet
        visible={attentionSheetVisible}
        onClose={closeAttentionSheet}
        items={attentionItems}
      />

      <AddTransactionModal
        visible={addMovementVisible}
        onClose={closeAddMovement}
        startWithReceiptPicker={startWithReceiptPicker}
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
    marginBottom: spacing['2xl'],
  },
  emptyTransactions: {
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
});
