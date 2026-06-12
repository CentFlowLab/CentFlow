import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

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
};

export function InsightsSection({ insights }: InsightsSectionProps) {
  return (
    <View style={styles.container}>
      <SectionHeader
        title="CentFlow Brain"
        subtitle="Insights inteligentes"
      />

      {insights.length === 0 ? (
        <EmptyState
          icon={
            <SymbolView
              name={{ ios: 'brain.head.profile', android: 'psychology', web: 'psychology' }}
              tintColor={colors.accent}
              size={32}
            />
          }
          title="Insights em preparação"
          description="À medida que registas movimentos e atualizas o património, o CentFlow Brain vai sugerir oportunidades e alertas personalizados."
        />
      ) : (
        insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))
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
        {insight.actionLabel && (
          <Text variant="caption" color="primary" style={styles.action}>
            {insight.actionLabel} →
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing['2xl'],
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
