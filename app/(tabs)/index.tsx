import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AttentionCard,
  DashboardHeaderLeading,
  DashboardSkeleton,
  DemoModeBadge,
  HomeAssetsSummaryCard,
  HomeGoalHighlightCard,
  HomePersonalizedInsightCard,
  HomeQuickActions,
  type RecommendedQuickAction,
  MetricCard,
  NetWorthHeroCard,
  SuggestionCard,
} from '@/components/dashboard';
import { AppHeader } from '@/components/layout';
import { AddTransactionModal, TransactionListItem } from '@/components/movements';
import { FinancialProfileDetailSheet, FinancialProfileProgress } from '@/components/profile';
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
import { formatCurrency, formatPercent } from '@/lib/utils/format';

export default function InicioScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useHomeScreenData();
  const { data: financialProfile, isLoading: isProfileScoreLoading } = useFinancialProfile();
  const { data: onboardingAnswers } = useOnboardingAnswers();

  const [profileDetailVisible, setProfileDetailVisible] = useState(false);
  const [addMovementVisible, setAddMovementVisible] = useState(false);
  const [startWithReceiptPicker, setStartWithReceiptPicker] = useState(false);

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

  const netWorthChangeColor =
    netWorthChangeThisMonth > 0
      ? colors.success
      : netWorthChangeThisMonth < 0
        ? colors.danger
        : colors.textMuted;

  // Personalized quick actions based on onboarding profile (receipts, goals, etc.)
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
        <ScreenContainer>
          {shouldShowDemoBadge(dataSource) ? <DemoModeBadge /> : null}

          <NetWorthHeroCard netWorth={netWorth} changePercent={netWorthChangePercent} />

          {showGoalHighlight && featuredGoal ? (
            <HomeGoalHighlightCard goal={featuredGoal} />
          ) : null}

          {showInsight && homeInsight ? (
            <HomePersonalizedInsightCard insight={homeInsight} />
          ) : null}

          <HomeAssetsSummaryCard summary={assetsSummary} hints={assetsHints} />

          <FinancialProfileProgress
            profile={financialProfile}
            isLoading={isProfileScoreLoading}
            variant="compact"
            style={styles.profileProgress}
            onPress={() => setProfileDetailVisible(true)}
          />

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

          <SectionHeader title="O que mudou?" subtitle="Resumo rápido do período" />
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Gastos"
              value={formatCurrency(weeklySpending)}
              subtitle="esta semana"
              icon={{
                ios: 'cart.fill',
                android: 'shopping_cart',
                web: 'shopping_cart',
              }}
              iconColor={colors.danger}
              valueColor={colors.text}
            />
            <MetricCard
              label="Património"
              value={formatCompactChange(netWorthChangeThisMonth)}
              subtitle="este mês"
              icon={{
                ios: 'chart.line.uptrend.xyaxis',
                android: 'trending_up',
                web: 'trending_up',
              }}
              iconColor={netWorthChangeColor}
              valueColor={netWorthChangeColor}
            />
            <MetricCard
              label="Inflação"
              value={
                personalInflation !== null ? formatPercent(personalInflation) : '—'
              }
              subtitle="pessoal"
              icon={{
                ios: 'percent',
                android: 'percent',
                web: 'percent',
              }}
              iconColor={colors.accent}
              valueColor={
                personalInflation !== null && personalInflation > 0
                  ? colors.warning
                  : colors.text
              }
            />
          </View>

          <View style={styles.section}>
            <SectionHeader
              title="O que precisa da minha atenção?"
              subtitle={
                attentionItems.length > 0
                  ? `${attentionItems.length} alerta${attentionItems.length > 1 ? 's' : ''}`
                  : undefined
              }
            />
            {attentionItems.length > 0 ? (
              attentionItems.slice(0, 4).map((item) => (
                <AttentionCard key={item.id} item={item} />
              ))
            ) : (
              <CardEmptyAttention />
            )}
          </View>

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

      <FinancialProfileDetailSheet
        visible={profileDetailVisible}
        profile={financialProfile}
        onClose={() => setProfileDetailVisible(false)}
      />

      <AddTransactionModal
        visible={addMovementVisible}
        onClose={closeAddMovement}
        startWithReceiptPicker={startWithReceiptPicker}
      />
    </View>
  );
}

function CardEmptyAttention() {
  return (
    <View style={styles.emptyAttention}>
      <SymbolView
        name={{ ios: 'checkmark.seal.fill', android: 'verified', web: 'verified' }}
        tintColor={colors.success}
        size={28}
      />
      <Text variant="bodyMedium" align="center">
        Nada urgente por agora
      </Text>
      <Text variant="caption" color="textSecondary" align="center">
        Garantias, créditos e subscrições estão sob controlo. Bom trabalho!
      </Text>
    </View>
  );
}

function formatCompactChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatCurrency(value)}`;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  profileProgress: {
    marginBottom: spacing['2xl'],
  },
  section: {
    marginBottom: spacing['2xl'],
  },
  emptyTransactions: {
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  emptyAttention: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing['2xl'],
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
