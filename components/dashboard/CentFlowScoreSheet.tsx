import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Card, Text } from '@/components/ui';
import type { CentFlowScoreResult } from '@/lib/domain/financial';
import { buildScoreExplanation } from '@/lib/domain/financial/score-explain';
import { colors, radius, spacing } from '@/lib/theme';

type CentFlowScoreSheetProps = {
  visible: boolean;
  score: CentFlowScoreResult;
  levelLabel: string;
  onClose: () => void;
};

const BAND_COLORS = {
  critical: colors.danger,
  fair: colors.warning,
  good: colors.primary,
  excellent: colors.success,
} as const;

export function CentFlowScoreSheet({
  visible,
  score,
  levelLabel,
  onClose,
}: CentFlowScoreSheetProps) {
  const accent = BAND_COLORS[score.band];
  const { earned, missing } = buildScoreExplanation(score);

  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="88%"
      header={(requestClose) => (
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="h2">CentFlow Score</Text>
            <Text variant="caption" color="textMuted">
              {levelLabel} · {score.bandLabel}
            </Text>
          </View>
          <Pressable
            onPress={requestClose}
            hitSlop={12}
            accessibilityLabel="Fechar"
            style={styles.closeButton}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              tintColor={colors.textMuted}
              size={20}
            />
          </Pressable>
        </View>
      )}>
      <Card variant="elevated" padding="md" style={styles.summaryCard}>
        <View style={styles.scoreRow}>
          <Text variant="display" style={{ color: accent }}>
            {score.score}
          </Text>
          <Text variant="h3" color="textMuted">
            /100
          </Text>
        </View>
        <Text variant="body" color="textSecondary">
          {score.summary}
        </Text>
      </Card>

      {earned.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Porque tens este valor
          </Text>
          {earned.map((line) => (
            <View key={line.key} style={styles.lineRow}>
              <Text variant="bodyMedium" color="success" style={styles.points}>
                +{line.points}
              </Text>
              <View style={styles.lineText}>
                <Text variant="bodyMedium">{line.label}</Text>
                <Text variant="caption" color="textSecondary">
                  {line.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {missing.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="textMuted">
            Como melhorar
          </Text>
          {missing.map((line) => {
            const potential = line.maxPoints - line.points;
            return (
              <View key={line.key} style={styles.lineRow}>
                <Text variant="bodyMedium" color="primary" style={styles.points}>
                  +{potential}
                </Text>
                <View style={styles.lineText}>
                  <Text variant="bodyMedium">{line.label}</Text>
                  <Text variant="caption" color="textSecondary">
                    {line.detail} ({line.points}/{line.maxPoints} pts)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  lineRow: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  points: {
    minWidth: 36,
    fontWeight: '700',
  },
  lineText: {
    flex: 1,
    gap: 2,
  },
});
