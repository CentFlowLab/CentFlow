import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Card, EmptyState, SectionHeader, Text } from '@/components/ui';
import type { AnalysisInsight } from '@/lib/domain/analysis.types';
import { colors, radius, spacing } from '@/lib/theme';

const INSIGHT_CONFIG = {
  opportunity: {
    icon: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
    color: colors.primary,
    bg: colors.primaryMuted,
  },
  warning: {
    icon: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
    color: colors.warning,
    bg: colors.accentMuted,
  },
  info: {
    icon: { ios: 'info.circle.fill', android: 'info', web: 'info' },
    color: colors.textSecondary,
    bg: colors.surfaceHighlight,
  },
  achievement: {
    icon: { ios: 'star.fill', android: 'star', web: 'star' },
    color: colors.success,
    bg: colors.successMuted,
  },
} as const;

type InsightsSectionProps = {
  insights: AnalysisInsight[];
  onAddMovement?: () => void;
};

export function InsightsSection({ insights, onAddMovement }: InsightsSectionProps) {
  const handleEmptyAction = () => {
    if (onAddMovement) {
      onAddMovement();
      return;
    }
    router.push('/(tabs)/movimentos?action=new-movement');
  };

  return (
    <View style={styles.container}>
      <SectionHeader title="Insights" subtitle="Análise inteligente dos teus dados" />

      {insights.length === 0 ? (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' }}
              tintColor={colors.primary}
              size={32}
            />
          }
          title="Vamos criar o teu histórico financeiro"
          description="Regista movimentos nas próximas semanas e os insights aparecem automaticamente — tendências, categorias e oportunidades de poupança."
          actionLabel="Adicionar movimento"
          onAction={handleEmptyAction}
        />
      ) : (
        insights.map((insight) => <InsightCard key={insight.id} insight={insight} />)
      )}
    </View>
  );
}

function InsightCard({ insight }: { insight: AnalysisInsight }) {
  const config = INSIGHT_CONFIG[insight.type];

  return (
    <Card variant="outlined" style={styles.insightCard}>
      <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
        <SymbolView name={config.icon} tintColor={config.color} size={20} />
      </View>
      <View style={styles.content}>
        <Text variant="bodyMedium" style={styles.title}>
          {insight.title}
        </Text>
        <Text variant="caption" color="textSecondary">
          {insight.description}
        </Text>
        {insight.actionLabel ? (
          <Pressable accessibilityRole="button">
            <Text variant="caption" color="primary" style={styles.action}>
              {insight.actionLabel} →
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  insightCard: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  action: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
