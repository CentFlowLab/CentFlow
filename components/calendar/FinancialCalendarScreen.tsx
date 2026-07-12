import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Card, LoadingSpinner, Text } from '@/components/ui';
import { useFinancialCalendar } from '@/hooks/useFinancialCalendar';
import type {
  FinancialCalendarDayRisk,
  FinancialCalendarProjectionDay,
} from '@/lib/domain/financial/calendar';
import { colors, radius, spacing } from '@/lib/theme';
import {
  addMonths,
  buildMonthGrid,
  formatMonthYear,
  getWeekdayLabels,
  startOfDay,
} from '@/lib/utils/calendar';
import { formatCurrency, toIsoDateString } from '@/lib/utils/format';

const RISK_COLORS: Record<FinancialCalendarDayRisk, string> = {
  neutral: colors.surface,
  attention: 'rgba(245, 158, 11, 0.22)',
  risk: 'rgba(239, 68, 68, 0.28)',
};

const RISK_BORDER: Record<FinancialCalendarDayRisk, string> = {
  neutral: colors.border,
  attention: colors.warning,
  risk: colors.danger,
};

function riskLabel(risk: FinancialCalendarDayRisk): string {
  switch (risk) {
    case 'risk':
      return 'Risco — saldo negativo projetado';
    case 'attention':
      return 'Atenção — saldo baixo';
    default:
      return 'Neutro';
  }
}

function DayDetail({ day }: { day: FinancialCalendarProjectionDay }) {
  const outflows = day.events.filter((event) => event.direction === 'outflow');
  const inflows = day.events.filter((event) => event.direction === 'inflow');

  return (
    <Card variant="outlined" style={styles.detailCard}>
      <Text variant="bodyMedium">{riskLabel(day.risk)}</Text>
      <Text variant="caption" color="textSecondary">
        Saldo projetado: {formatCurrency(day.projectedBalance)}
      </Text>

      {day.problemStartsOn && day.risk !== 'neutral' ? (
        <Text variant="caption" color="warning">
          O problema começa a {day.problemStartsOn.slice(8, 10)}/{day.problemStartsOn.slice(5, 7)}
        </Text>
      ) : null}

      {outflows.length > 0 ? (
        <View style={styles.eventGroup}>
          <Text variant="label">Saídas neste dia</Text>
          {outflows.map((event) => (
            <Text key={event.id} variant="caption" color="textSecondary">
              • {event.label}: −{formatCurrency(event.amount)}
              {event.note ? ` (${event.note})` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {inflows.length > 0 ? (
        <View style={styles.eventGroup}>
          <Text variant="label">Entradas neste dia</Text>
          {inflows.map((event) => (
            <Text key={event.id} variant="caption" color="textSecondary">
              • {event.label}: +{formatCurrency(event.amount)}
              {event.note ? ` (${event.note})` : ''}
            </Text>
          ))}
        </View>
      ) : null}

      {day.nextIncomeDate ? (
        <Text variant="caption" color="textMuted">
          Próxima entrada esperada: {day.nextIncomeDate.slice(8, 10)}/{day.nextIncomeDate.slice(5, 7)}
        </Text>
      ) : null}

      {day.events.length === 0 ? (
        <Text variant="caption" color="textMuted">
          Sem eventos conhecidos neste dia — o saldo reflecte gasto variável médio.
        </Text>
      ) : null}
    </Card>
  );
}

export function FinancialCalendarScreen() {
  const { calendar, isLoading } = useFinancialCalendar({ horizonDays: 30 });
  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const dayMap = useMemo(() => {
    const map = new Map<string, FinancialCalendarProjectionDay>();
    for (const day of calendar?.days ?? []) {
      map.set(day.date, day);
    }
    return map;
  }, [calendar?.days]);

  const monthGrid = useMemo(
    () => buildMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth],
  );

  const selectedDay = selectedDate ? dayMap.get(selectedDate) ?? null : null;
  const weekdays = getWeekdayLabels();

  if (isLoading || !calendar) {
    return (
      <View style={styles.loading}>
        <LoadingSpinner message="A calcular calendário financeiro..." />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card variant="elevated" style={styles.legendCard}>
        <Text variant="h3">Calendário de caixa</Text>
        <Text variant="caption" color="textSecondary">
          {calendar.incomePatternNote}
        </Text>
        <View style={styles.legendRow}>
          <LegendDot color={RISK_COLORS.neutral} border={RISK_BORDER.neutral} label="Neutro" />
          <LegendDot color={RISK_COLORS.attention} border={RISK_BORDER.attention} label="Atenção" />
          <LegendDot color={RISK_COLORS.risk} border={RISK_BORDER.risk} label="Risco" />
        </View>
      </Card>

      <Card variant="elevated" style={styles.calendarCard}>
        <View style={styles.header}>
          <Pressable onPress={() => setVisibleMonth((current) => addMonths(current, -1))} hitSlop={8}>
            <SymbolView
              name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
              tintColor={colors.textSecondary}
              size={20}
            />
          </Pressable>
          <Text variant="bodyMedium">{formatMonthYear(visibleMonth)}</Text>
          <Pressable onPress={() => setVisibleMonth((current) => addMonths(current, 1))} hitSlop={8}>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              tintColor={colors.textSecondary}
              size={20}
            />
          </Pressable>
        </View>

        <View style={styles.weekdayRow}>
          {weekdays.map((label) => (
            <Text key={label} variant="caption" color="textMuted" style={styles.weekday}>
              {label}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {monthGrid.map((cell) => {
            const iso = toIsoDateString(cell.date);
            const projectionDay = dayMap.get(iso);
            const risk = projectionDay?.risk ?? 'neutral';
            const inHorizon = Boolean(projectionDay);
            const isSelected = selectedDate === iso;

            return (
              <Pressable
                key={iso}
                disabled={!inHorizon || !cell.inCurrentMonth}
                onPress={() => setSelectedDate(iso)}
                style={[
                  styles.dayCell,
                  !cell.inCurrentMonth && styles.dayCellOutside,
                  inHorizon && {
                    backgroundColor: RISK_COLORS[risk],
                    borderColor: RISK_BORDER[risk],
                  },
                  isSelected && styles.dayCellSelected,
                ]}>
                <Text
                  variant="caption"
                  color={cell.inCurrentMonth ? 'textPrimary' : 'textMuted'}
                  style={styles.dayNumber}>
                  {cell.date.getDate()}
                </Text>
                {projectionDay && projectionDay.events.length > 0 ? (
                  <View style={styles.dot} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Card>

      {calendar.firstRiskDay ? (
        <Card variant="outlined" style={styles.alertCard}>
          <Text variant="bodyMedium" color="danger">
            Primeiro dia de risco: {calendar.firstRiskDay.date.slice(8, 10)}/
            {calendar.firstRiskDay.date.slice(5, 7)}
          </Text>
          <Text variant="caption" color="textSecondary">
            Saldo projetado {formatCurrency(calendar.firstRiskDay.projectedBalance)}
          </Text>
        </Card>
      ) : null}

      {selectedDay ? <DayDetail day={selectedDay} /> : (
        <Text variant="caption" color="textMuted" align="center">
          Toca num dia para ver eventos e impacto no saldo.
        </Text>
      )}
    </ScrollView>
  );
}

function LegendDot({
  color,
  border,
  label,
}: {
  color: string;
  border: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor: border }]} />
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  container: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  legendCard: {
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendSwatch: {
    width: 14,
    height: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  calendarCard: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  dayCellOutside: {
    opacity: 0.35,
  },
  dayCellSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  dayNumber: {
    fontWeight: '600',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  alertCard: {
    gap: spacing.xs,
    borderColor: colors.danger,
  },
  detailCard: {
    gap: spacing.sm,
  },
  eventGroup: {
    gap: 2,
  },
});
