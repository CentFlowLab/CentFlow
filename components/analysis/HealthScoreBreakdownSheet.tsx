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
  if (!score.hasSufficientData) {
    return (
      <DraggableBottomSheet
        visible={visible}
        onClose={onClose}
        maxHeight="70%"
        header={<Text variant="bodyMedium">Detalhe da saúde financeira</Text>}>
        <View style={styles.content}>
          <Text variant="h3" align="center">
            Sem dados suficientes
          </Text>
          <Text variant="body" color="textSecondary" style={styles.explanation}>
            O score de saúde financeira combina 5 componentes, cada um com 0 a 20 pontos (total
            máximo 100):
          </Text>
          <View style={styles.componentList}>
            {Object.values(score.components).map((component) => (
              <Text key={component.label} variant="bodyMedium">
                • {component.label} (0–{component.max})
              </Text>
            ))}
          </View>
          <Text variant="caption" color="textMuted" style={styles.explanation}>
            Regista pelo menos 3 movimentos este mês ou adiciona rendimentos, despesas, créditos ou
            subscrições para obteres uma avaliação fiável.
          </Text>
        </View>
      </DraggableBottomSheet>
    );
  }

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
  explanation: {
    lineHeight: 22,
  },
  componentList: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
});
