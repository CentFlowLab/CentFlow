import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, SectionHeader, Text } from '@/components/ui';
import type { Insight } from '@/lib/insights/types';
import { colors, spacing } from '@/lib/theme';

const TYPE_BORDER: Record<Insight['type'], string> = {
  warning: colors.warning,
  positive: colors.success,
  neutral: colors.textMuted,
  tip: colors.primary,
};

const CARD_HEIGHT = 168;

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
        <View style={styles.cardBody}>
          <Text style={styles.emoji}>{insight.icon}</Text>
          <Text variant="bodyMedium" numberOfLines={2}>
            {insight.title}
          </Text>
          <Text variant="caption" color="textMuted" numberOfLines={3} style={styles.body}>
            {insight.body}
          </Text>
          {insight.action ? (
            <Text variant="caption" color="primary" style={styles.action}>
              {insight.action.label} →
            </Text>
          ) : (
            <View style={styles.actionSpacer} />
          )}
        </View>
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
    alignItems: 'stretch',
  },
  card: {
    width: 260,
    height: CARD_HEIGHT,
    borderLeftWidth: 3,
    padding: spacing.md,
  },
  cardBody: {
    flex: 1,
    gap: spacing.xs,
  },
  emoji: {
    fontSize: 22,
  },
  body: {
    flex: 1,
  },
  action: {
    marginTop: 'auto',
    fontWeight: '600',
  },
  actionSpacer: {
    height: spacing.md,
  },
  pressed: {
    opacity: 0.92,
  },
});
