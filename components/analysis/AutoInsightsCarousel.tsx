import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { Insight } from '@/lib/insights/types';
import { colors, radius, spacing } from '@/lib/theme';

const TYPE_BORDER: Record<Insight['type'], string> = {
  warning: colors.warning,
  positive: colors.success,
  neutral: colors.textMuted,
  tip: colors.primary,
};

type AutoInsightsCarouselProps = {
  insights: Insight[];
};

export function AutoInsightsCarousel({ insights }: AutoInsightsCarouselProps) {
  const items = insights ?? [];
  if (items.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Insights" subtitle="Gerados automaticamente a partir dos teus dados" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {items.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </ScrollView>
    </View>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <Pressable
      onPress={() => insight.action && router.push(insight.action.route as never)}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card
        variant="outlined"
        style={[styles.card, { borderLeftColor: TYPE_BORDER[insight.type] }]}>
        <Text style={styles.emoji}>{insight.icon}</Text>
        <Text variant="bodyMedium" numberOfLines={2}>
          {insight.title}
        </Text>
        <Text variant="caption" color="textMuted" numberOfLines={4}>
          {insight.body}
        </Text>
        {insight.action ? (
          <Text variant="caption" color="primary" style={styles.action}>
            {insight.action.label} →
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.lg,
  },
  scroll: {
    gap: spacing.md,
    paddingRight: spacing.lg,
  },
  card: {
    width: 260,
    gap: spacing.sm,
    borderLeftWidth: 3,
    padding: spacing.md,
  },
  emoji: {
    fontSize: 22,
  },
  action: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.92,
  },
});
