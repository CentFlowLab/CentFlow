import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { SegmentedControl } from '@/components/layout';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useCashflowProjection } from '@/hooks/useCashflowProjection';
import {
  CASHFLOW_PROJECTION_HORIZONS,
  type CashflowProjectionHorizon,
  type CashflowProjectionPoint,
} from '@/lib/projections';
import { spacing, useTheme, useThemedStyles } from '@/lib/theme';
import type { ThemeColors } from '@/lib/theme/types';
import { formatCurrency, formatDateShort } from '@/lib/utils/format';

const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 12, right: 8, bottom: 24, left: 8 };

type CashflowProjectionCardProps = {
  /** Largura útil do cartão (ecrã menos padding). */
  width?: number;
};

export function CashflowProjectionCard({ width = 320 }: CashflowProjectionCardProps) {
  const [horizon, setHorizon] = useState<CashflowProjectionHorizon>(30);
  const { projection, isLoading } = useCashflowProjection(horizon);
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  const chartWidth = Math.max(260, width - spacing.lg * 2);

  const segments = useMemo(
    () =>
      CASHFLOW_PROJECTION_HORIZONS.map((days) => ({
        key: String(days),
        label: `${days}d`,
      })),
    [],
  );

  if (isLoading) {
    return (
      <Card variant="elevated" style={styles.card}>
        <LoadingSpinner message="A calcular projeção..." />
      </Card>
    );
  }

  if (!projection) {
    return null;
  }

  const supportText = projection.hasEnoughHistory
    ? `Com base no teu padrão actual, o teu saldo em ${formatDateShort(projection.horizonDate)} deverá ser ${formatCurrency(projection.horizonBalance)}.`
    : 'Regista mais movimentos nos próximos meses para uma projeção mais fiável.';

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="h3">Saldo previsto</Text>
      <Text variant="caption" color="textMuted" style={styles.subtitle}>
        Cashflow projectado com mediana de gastos e recorrências conhecidas
      </Text>

      <Text variant="body" color="textSecondary" style={styles.supportText}>
        {supportText}
      </Text>

      {projection.negativeCrossing ? (
        <View style={styles.warningBanner}>
          <Text variant="caption" style={styles.warningText}>
            Saldo negativo previsto em {formatDateShort(projection.negativeCrossing.date)} (
            {formatCurrency(projection.negativeCrossing.balance)})
          </Text>
        </View>
      ) : null}

      <Button
        label="Ver calendário de caixa"
        variant="secondary"
        onPress={() => router.push('/calendar')}
        fullWidth
      />

      <SegmentedControl
        segments={segments}
        value={String(horizon)}
        onChange={(value) => setHorizon(Number(value) as CashflowProjectionHorizon)}
      />

      <CashflowLineChart
        points={projection.points}
        horizon={horizon}
        width={chartWidth}
        height={CHART_HEIGHT}
        negativeCrossing={projection.negativeCrossing}
        colors={colors}
      />

      <View style={styles.legendRow}>
        <LegendDot color={colors.primary} label="Saldo projectado" />
        {projection.negativeCrossing ? (
          <LegendDot color={colors.warning} label="Aviso saldo negativo" />
        ) : null}
      </View>
    </Card>
  );
}

type CashflowLineChartProps = {
  points: CashflowProjectionPoint[];
  horizon: CashflowProjectionHorizon;
  width: number;
  height: number;
  negativeCrossing?: { date: string; dayIndex: number; balance: number };
  colors: ThemeColors;
};

function CashflowLineChart({
  points,
  horizon,
  width,
  height,
  negativeCrossing,
  colors,
}: CashflowLineChartProps) {
  const plotWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const plotHeight = height - CHART_PADDING.top - CHART_PADDING.bottom;

  const balances = points.map((point) => point.balance);
  const rawMin = Math.min(...balances, 0);
  const rawMax = Math.max(...balances, 0);
  const range = rawMax - rawMin || 1;
  const minY = rawMin - range * 0.08;
  const maxY = rawMax + range * 0.08;

  const toX = (dayIndex: number) =>
    CHART_PADDING.left + (dayIndex / horizon) * plotWidth;
  const toY = (balance: number) =>
    CHART_PADDING.top + plotHeight - ((balance - minY) / (maxY - minY)) * plotHeight;

  const linePath = points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command}${toX(point.dayIndex)},${toY(point.balance)}`;
    })
    .join(' ');

  const zeroY = toY(0);
  const showZeroLine = minY < 0 && maxY > 0;

  const markerDays = CASHFLOW_PROJECTION_HORIZONS.filter((day) => day <= horizon);

  const crossingPoint = negativeCrossing
    ? points.find((point) => point.date === negativeCrossing.date)
    : undefined;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {showZeroLine ? (
          <Line
            x1={CHART_PADDING.left}
            y1={zeroY}
            x2={width - CHART_PADDING.right}
            y2={zeroY}
            stroke={colors.borderStrong}
            strokeWidth={1}
            strokeDasharray="4 4"
          />
        ) : null}

        <Path d={linePath} stroke={colors.primary} strokeWidth={2.5} fill="none" />

        {markerDays.map((day) => {
          const x = toX(day);
          const markerPoint = points.find((point) => point.dayIndex === day);
          if (!markerPoint) return null;
          return (
            <Circle
              key={`marker-${day}`}
              cx={x}
              cy={toY(markerPoint.balance)}
              r={4}
              fill={colors.accent}
              stroke={colors.background}
              strokeWidth={1.5}
            />
          );
        })}

        {crossingPoint ? (
          <Circle
            cx={toX(crossingPoint.dayIndex)}
            cy={toY(crossingPoint.balance)}
            r={6}
            fill={colors.warning}
            stroke={colors.background}
            strokeWidth={2}
          />
        ) : null}

        {markerDays.map((day) => (
          <SvgText
            key={`label-${day}`}
            x={toX(day)}
            y={height - 4}
            fontSize={10}
            fill={colors.textMuted}
            textAnchor="middle">
            {day}d
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      gap: spacing.md,
    },
    subtitle: {
      marginTop: -spacing.xs,
    },
    supportText: {
      lineHeight: 22,
    },
    warningBanner: {
      backgroundColor: colors.warning + '22',
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.warning + '55',
    },
    warningText: {
      color: colors.warning,
      fontWeight: '600',
    },
    legendRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
  });
}
