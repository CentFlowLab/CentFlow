import { StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { CentFlowScoreResult } from '@/lib/domain/financial';
import { colors, radius, spacing } from '@/lib/theme';

type CentFlowScoreCardProps = {
  score: CentFlowScoreResult;
  levelLabel: string;
  nextLevelLabel?: string | null;
  progressPercent: number;
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
}: CentFlowScoreCardProps) {
  const accent = BAND_COLORS[score.band];

  return (
    <Card variant="elevated" style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text variant="label" color="textMuted">
            CentFlow Score
          </Text>
          <View style={styles.scoreRow}>
            <Text variant="display" style={{ color: accent }}>
              {score.score}
            </Text>
            <Text variant="h3" color="textMuted">
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
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
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
  progressBlock: {
    gap: spacing.sm,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.full,
  },
});
