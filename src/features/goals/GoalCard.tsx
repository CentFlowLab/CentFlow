import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, type GoalStatus, type SavingsGoal } from '@/core/finance';
import { useLocaleFormat } from '@/i18n';
import { Text } from '@/ui/components';
import { categorySwatch, radius, spacing, useTheme } from '@/ui/theme';

import { DEFAULT_GOAL_COLOR, DEFAULT_GOAL_ICON, GoalIcon } from './GoalIcon';

/**
 * Cartão horizontal de um objetivo: ícone à esquerda, nome e percentagem ao centro, valores à
 * direita e a barra de progresso integrada no fundo do próprio cartão (o preenchimento ocupa a
 * fração poupada). Concluído: fundo esmeralda e a data em que a meta foi atingida.
 */
export function GoalCard({
  goal,
  status,
  onPress,
}: {
  goal: SavingsGoal;
  status: GoalStatus;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const { formatMoney, formatPercent, formatDate } = useLocaleFormat();
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: goal.currency });
  const color = goal.color ?? DEFAULT_GOAL_COLOR;
  const swatch = categorySwatch(color, scheme);
  const done = status.reached;
  const percent = formatPercent(status.ratio, 0);
  const subtitle = done
    ? status.achievedOn
      ? t('goals.completedOn', {
          date: formatDate(calendarDateToLocalDate(status.achievedOn), 'medium'),
        })
      : t('goals.completedBadge')
    : t('goals.percentDone', { percent });
  const detail = done
    ? status.surplus > 0
      ? t('goals.over', { amount: money(status.surplus) })
      : t('goals.targetShort', { amount: money(goal.targetAmount) })
    : t('goals.remainingShort', { amount: money(status.remaining) });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.name}, ${t('goals.savedShort', {
        amount: money(status.saved),
      })}, ${t('goals.targetShort', { amount: money(goal.targetAmount) })}, ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: done ? colors.positiveMuted : colors.surface,
          borderColor: done ? colors.positive : colors.border,
          boxShadow: scheme === 'light' ? `0 1px 2px ${colors.shadow}` : undefined,
        },
        pressed && { transform: [{ scale: 0.99 }] },
      ]}>
      {!done ? (
        // Preenchimento proporcional por trás do conteúdo, na cor do objetivo.
        <View
          pointerEvents="none"
          style={[
            styles.fill,
            { width: `${status.ratio * 100}%`, backgroundColor: swatch.background },
          ]}
        />
      ) : null}
      <View style={styles.row}>
        <GoalIcon icon={goal.icon ?? DEFAULT_GOAL_ICON} color={color} done={done} />
        <View style={styles.middle}>
          <Text variant="bodyStrong" numberOfLines={2}>
            {goal.name}
          </Text>
          <Text variant="footnote" tone={done ? 'positive' : 'secondary'}>
            {subtitle}
          </Text>
          {done ? (
            <Text variant="caption" tone="secondary" tabular>
              {detail}
            </Text>
          ) : null}
        </View>
        <View style={styles.right}>
          <Text variant="bodyStrong" tabular numberOfLines={1}>
            {money(status.saved)}
          </Text>
          {!done ? (
            <>
              <Text variant="caption" tone="secondary" tabular numberOfLines={1}>
                {t('goals.ofTarget', { amount: money(goal.targetAmount) })}
              </Text>
              <Text variant="caption" tone="tertiary" tabular numberOfLines={1}>
                {detail}
              </Text>
            </>
          ) : null}
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View
          style={[
            styles.trackFill,
            {
              width: `${status.ratio * 100}%`,
              backgroundColor: done ? colors.positive : swatch.foreground,
            },
          ]}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 76,
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md + 4,
  },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2, maxWidth: '45%' },
  track: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 4 },
  trackFill: { height: '100%' },
});
