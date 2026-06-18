import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { CentFlowScoreResult } from '@/lib/domain/financial';
import { buildScoreExplanation } from '@/lib/domain/financial/score-explain';
import { colors, radius, spacing } from '@/lib/theme';

type CentFlowScoreCardProps = {
  score: CentFlowScoreResult;
  levelLabel: string;
  nextLevelLabel?: string | null;
  progressPercent: number;
  onPress?: () => void;
};

const BAND_COLORS = {
  critical: colors.danger,
  fair: colors.warning,
  good: colors.primary,
  excellent: colors.success,
} as const;

export function CentFlowScoreCard({
  score,
  levelLabel,
  nextLevelLabel,
  progressPercent,
  onPress,
}: CentFlowScoreCardProps) {
  const accent = BAND_COLORS[score.band];
  const { earned, missing } = buildScoreExplanation(score);
  const topEarned = earned.slice(0, 2);

  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text variant="label" color="textMuted">
            CentFlow Score
          </Text>
          <View style={styles.scoreRow}>
            <Text variant="h1" style={{ color: accent }}>
              {score.score}
            </Text>
            <Text variant="bodyMedium" color="textMuted">
              /100
            </Text>
          </View>
          <Text variant="caption" color="textSecondary">
            {score.bandLabel} · {score.summary}
          </Text>
        </View>
        <View style={[styles.badge, { borderColor: accent }]}>
          <Text variant="caption" style={{ color: accent }}>
            {levelLabel}
          </Text>
        </View>
      </View>

      {topEarned.length > 0 ? (
        <View style={styles.preview}>
          {topEarned.map((line) => (
            <Text key={line.key} variant="caption" color="textSecondary">
              +{line.points} {line.label.toLowerCase()}
            </Text>
          ))}
        </View>
      ) : null}

      {nextLevelLabel ? (
        <View style={styles.progressBlock}>
          <View style={styles.progressLabels}>
            <Text variant="caption" color="textMuted">
              Nível financeiro
            </Text>
            <Text variant="caption" color="textSecondary">
              Próximo: {nextLevelLabel}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: accent }]} />
          </View>
        </View>
      ) : null}

      {onPress ? (
        <Text variant="caption" color="primary">
          Como melhorar{missing.length > 0 ? ` · +${missing.length} áreas` : ''} →
        </Text>
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <Card variant="elevated" style={styles.card}>
        {content}
      </Card>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Card variant="elevated" style={styles.card}>
        {content}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.92,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerMain: {
    flex: 1,
    gap: spacing.xs,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  preview: {
    gap: 2,
    paddingTop: spacing.xs,
  },
  progressBlock: {
    gap: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
