import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { HomePersonalizedInsight } from '@/lib/onboarding/personalization';
import { colors, radius, spacing } from '@/lib/theme';

type HomePersonalizedInsightCardProps = {
  insight: HomePersonalizedInsight;
};

export function HomePersonalizedInsightCard({ insight }: HomePersonalizedInsightCardProps) {
  return (
    <Pressable
      onPress={insight.ctaRoute ? () => router.push(insight.ctaRoute as Href) : undefined}
      disabled={!insight.ctaRoute}
      style={({ pressed }) => [pressed && insight.ctaRoute ? styles.pressed : null]}>
      <Card variant="outlined" style={styles.card}>
        <View style={styles.emojiBox}>
          <Text variant="h2" style={styles.emoji}>
            {insight.emoji}
          </Text>
        </View>
        <View style={styles.content}>
          <Text variant="bodyMedium">{insight.title}</Text>
          <Text variant="caption" color="textSecondary" style={styles.message}>
            {insight.message}
          </Text>
          {insight.ctaLabel ? (
            <Text variant="caption" color="primary" style={styles.cta}>
              {insight.ctaLabel} →
            </Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
    backgroundColor: colors.backgroundElevated,
    borderColor: colors.primary,
  },
  pressed: {
    opacity: 0.92,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  message: {
    lineHeight: 18,
  },
  cta: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
});
