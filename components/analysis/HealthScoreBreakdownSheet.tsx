import { StyleSheet, View } from 'react-native';

import { DraggableBottomSheet } from '@/components/layout';
import { Text } from '@/components/ui';
import type { HealthScoreResult } from '@/lib/insights/types';
import { colors, spacing } from '@/lib/theme';

type HealthScoreBreakdownSheetProps = {
  visible: boolean;
  score: HealthScoreResult;
  onClose: () => void;
};

export function HealthScoreBreakdownSheet({
  visible,
  score,
  onClose,
}: HealthScoreBreakdownSheetProps) {
  return (
    <DraggableBottomSheet
      visible={visible}
      onClose={onClose}
      maxHeight="70%"
      header={<Text variant="bodyMedium">Detalhe da saúde financeira</Text>}>
      <View style={styles.content}>
        <Text variant="h2" align="center" style={{ color: colors.primary }}>
          {score.total}/100
        </Text>
        {Object.values(score.components).map((component) => (
          <View key={component.label} style={styles.row}>
            <View style={styles.rowHeader}>
              <Text variant="bodyMedium">{component.label}</Text>
              <Text variant="bodyMedium" color="primary">
                {component.score}/{component.max}
              </Text>
            </View>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${(component.score / component.max) * 100}%`,
                    backgroundColor: component.hasData ? colors.primary : colors.textMuted,
                  },
                ]}
              />
            </View>
            <Text variant="caption" color="textMuted">
              {component.detail}
            </Text>
          </View>
        ))}
      </View>
    </DraggableBottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.xs,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceHighlight,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
});
