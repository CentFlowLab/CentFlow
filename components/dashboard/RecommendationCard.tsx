import { useQueryClient } from '@tanstack/react-query';
import { Pressable, StyleSheet, View } from 'react-native';

import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';

import { Card, Text } from '@/components/ui';
import type { Recommendation, RecommendationPriority } from '@/lib/domain/financial/recommendations';
import { colors, spacing } from '@/lib/theme';

const PRIORITY_LABEL: Record<RecommendationPriority, string> = {
  alta: 'Alta',
  média: 'Média',
  baixa: 'Baixa',
};

const PRIORITY_COLOR: Record<RecommendationPriority, string> = {
  alta: colors.danger,
  média: colors.warning,
  baixa: colors.textMuted,
};

type RecommendationCardProps = {
  recommendation: Recommendation;
  onIgnoreHabit?: (habitId: string) => void;
};

export function RecommendationCard({ recommendation, onIgnoreHabit }: RecommendationCardProps) {
  function handlePress() {
    if (recommendation.ctaRoute) {
      router.push(recommendation.ctaRoute as never);
    }
  }

  function handleIgnoreHabit() {
    if (recommendation.habitId && onIgnoreHabit) {
      onIgnoreHabit(recommendation.habitId);
    }
  }

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.iconBox}>
        <SymbolView
          name={{ ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' }}
          tintColor={colors.primary}
          size={20}
        />
      </View>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={recommendation.title}
        style={styles.content}>
        <View style={styles.titleRow}>
          <Text variant="bodyMedium" style={styles.title}>
            {recommendation.title}
          </Text>
          <Text variant="caption" style={{ color: PRIORITY_COLOR[recommendation.priority] }}>
            {PRIORITY_LABEL[recommendation.priority]}
          </Text>
        </View>
        <Text variant="caption" color="textSecondary">
          {recommendation.explanation}
        </Text>
        <Text variant="caption" color="primary" style={styles.action}>
          {recommendation.suggestedAction} →
        </Text>
      </Pressable>
      {recommendation.habitId && onIgnoreHabit ? (
        <Pressable
          onPress={handleIgnoreHabit}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ignorar este padrão"
          style={styles.ignoreWrap}>
          <Text variant="caption" color="textMuted" style={styles.ignore}>
            Ignorar
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontWeight: '600',
  },
  action: {
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  ignore: {
    textDecorationLine: 'underline',
  },
  ignoreWrap: {
    alignSelf: 'flex-start',
    paddingTop: spacing.xs,
  },
});
