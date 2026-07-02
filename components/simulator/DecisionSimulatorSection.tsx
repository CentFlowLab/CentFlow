import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import { SIMULATION_PRESETS } from '@/lib/domain/financial/simulator';
import type { SimulationScenarioType } from '@/lib/domain/financial/simulator.types';
import { openDecisionSimulator } from '@/lib/simulator/simulator-bridge';
import { colors, spacing } from '@/lib/theme';

const ICON_MAP = {
  percent: { ios: 'percent', android: 'percent', web: 'percent' },
  credit_card: { ios: 'creditcard.fill', android: 'credit_card', web: 'credit_card' },
  flag: { ios: 'flag.fill', android: 'flag', web: 'flag' },
  subscriptions: { ios: 'arrow.triangle.2.circlepath', android: 'sync', web: 'sync' },
  trending_down: { ios: 'chart.line.downtrend.xyaxis', android: 'trending_down', web: 'trending_down' },
  savings: { ios: 'leaf.fill', android: 'eco', web: 'eco' },
} as const;

type DecisionSimulatorSectionProps = {
  onOpenPreset?: (type: SimulationScenarioType) => void;
};

export function DecisionSimulatorSection({ onOpenPreset }: DecisionSimulatorSectionProps) {
  return (
    <View style={styles.container}>
      <Text variant="label">Simular decisão</Text>
      <Text variant="caption" color="textSecondary">
        Testa cenários sem alterar os teus dados reais.
      </Text>
      <View style={styles.grid}>
        {SIMULATION_PRESETS.map((preset) => (
          <Pressable
            key={preset.type}
            onPress={() => {
              onOpenPreset?.(preset.type);
              openDecisionSimulator({ presetType: preset.type });
            }}
            accessibilityRole="button"
            accessibilityLabel={preset.label}>
            <Card variant="outlined" style={styles.card}>
              <SymbolView
                name={ICON_MAP[preset.icon as keyof typeof ICON_MAP] ?? ICON_MAP.percent}
                tintColor={colors.primary}
                size={20}
              />
              <Text variant="caption" style={styles.cardTitle}>
                {preset.label}
              </Text>
              <Text variant="caption" color="textMuted" numberOfLines={2}>
                {preset.description}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    width: 150,
    gap: spacing.xs,
    minHeight: 96,
  },
  cardTitle: {
    fontWeight: '600',
  },
});
