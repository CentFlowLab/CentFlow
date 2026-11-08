import { StyleSheet, View } from 'react-native';

import { radius, spacing, useTheme } from '../theme';
import { Text } from './Text';

export type BarChartGroup = {
  key: string;
  label: string;
  /** Valores não negativos (ex.: unidades mínimas); a escala é relativa ao maior. */
  values: readonly number[];
  /** Descrição completa do grupo para leitores de ecrã. */
  accessibilityLabel: string;
  highlighted?: boolean;
};

type Props = {
  groups: readonly BarChartGroup[];
  /** Uma cor por série (mesma ordem de `values`). */
  seriesColors: readonly string[];
  height?: number;
};

/** Gráfico de barras agrupadas, desenhado com Views (sem bibliotecas de gráficos). */
export function BarChart({ groups, seriesColors, height = 140 }: Props) {
  const { colors } = useTheme();
  const max = Math.max(1, ...groups.flatMap((group) => group.values));

  return (
    <View style={styles.container}>
      {groups.map((group) => (
        <View
          key={group.key}
          accessible
          accessibilityLabel={group.accessibilityLabel}
          style={styles.group}>
          <View style={[styles.bars, { height }]}>
            {group.values.map((value, index) => (
              <View
                key={index}
                style={[
                  styles.bar,
                  {
                    height: value > 0 ? Math.max(2, (value / max) * height) : 0,
                    backgroundColor: seriesColors[index] ?? colors.primary,
                  },
                ]}
              />
            ))}
          </View>
          <Text
            variant="caption"
            tone={group.highlighted ? 'primary' : 'tertiary'}
            align="center"
            numberOfLines={1}>
            {group.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  group: {
    flex: 1,
    gap: spacing.xs,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 3,
  },
  bar: {
    flex: 1,
    maxWidth: 14,
    borderTopLeftRadius: radius.xs - 2,
    borderTopRightRadius: radius.xs - 2,
  },
});
