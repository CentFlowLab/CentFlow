import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  AttentionCard,
  DashboardGreeting,
  DashboardSkeleton,
  MetricCard,
  NetWorthHeroCard,
  SuggestionCard,
} from '@/components/dashboard';
import { FinancialProfileDetailSheet, FinancialProfileProgress } from '@/components/profile';
import { EmptyState, ErrorState, RefetchingIndicator, ScreenContainer, SectionHeader, Text } from '@/components/ui';
import { useDashboardData } from '@/hooks/queries/useDashboardData';
import { useFinancialProfile } from '@/hooks/queries/useFinancialProfile';
import { formatCurrency, formatPercent } from '@/lib/utils/format';
import { colors, spacing } from '@/lib/theme';

export default function InicioScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useDashboardData();
  const { data: financialProfile, isLoading: isProfileScoreLoading } = useFinancialProfile();
  const [profileDetailVisible, setProfileDetailVisible] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.screen}>
        <DashboardGreeting />
        <ScreenContainer>
          <DashboardSkeleton />
        </ScreenContainer>
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View style={styles.screen}>
        <DashboardGreeting />
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
  } = data;

  const netWorthChangeColor =
    netWorthChangeThisMonth > 0
      ? colors.success
      : netWorthChangeThisMonth < 0
        ? colors.danger
        : colors.textMuted;

  return (
    <View style={styles.screen}>
      <DashboardGreeting />

      <ScreenContainer>
        <NetWorthHeroCard netWorth={netWorth} changePercent={netWorthChangePercent} />

        <FinancialProfileProgress
          profile={financialProfile}
          isLoading={isProfileScoreLoading}
          variant="compact"
          style={styles.profileProgress}
          onPress={() => setProfileDetailVisible(true)}
        />

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
              personalInflation !== null
                ? formatPercent(personalInflation)
                : '—'
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
            <EmptyState
              icon={
                <SymbolView
                  name={{
                    ios: 'lightbulb.fill',
                    android: 'lightbulb',
                    web: 'lightbulb',
                  }}
                  tintColor={colors.primary}
                  size={28}
                />
              }
              title="Tudo em ordem"
              description="Quando tivermos mais dados, aparecerão aqui sugestões personalizadas para optimizar as tuas finanças."
            />
          )}
        </View>

        <RefetchingIndicator visible={isRefetching} />
      </ScreenContainer>

      <FinancialProfileDetailSheet
        visible={profileDetailVisible}
        profile={financialProfile}
        onClose={() => setProfileDetailVisible(false)}
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
