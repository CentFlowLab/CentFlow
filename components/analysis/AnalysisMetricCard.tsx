import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { AnalysisMetric } from '@/lib/domain/analysis.types';
import { colors, spacing } from '@/lib/theme';

type AnalysisMetricCardProps = {
  metric: AnalysisMetric;
};

export function AnalysisMetricCard({ metric }: AnalysisMetricCardProps) {
  const iconColor = metric.color ?? colors.primary;

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
        <SymbolView
          name={metric.icon as SymbolViewProps['name']}
          tintColor={iconColor}
          size={20}
        />
      </View>
      <Text variant="label" color="textMuted">
        {metric.label}
      </Text>
      <Text variant="h3" style={metric.color ? { color: metric.color } : undefined}>
        {metric.value}
      </Text>
      {metric.subtitle && (
        <Text variant="caption" color="textMuted">
          {metric.subtitle}
        </Text>
      )}
      {metric.trend && metric.trend !== 'neutral' && (
        <SymbolView
          name={{
            ios: metric.trend === 'up' ? 'arrow.up.right' : 'arrow.down.right',
            android: metric.trend === 'up' ? 'trending_up' : 'trending_down',
            web: metric.trend === 'up' ? 'trending_up' : 'trending_down',
          }}
          tintColor={metric.trend === 'up' ? colors.success : colors.danger}
          size={14}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    gap: spacing.xs,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
