import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import {
  buildFinancialHealth,
  type CalendarDate,
  type HealthPillar,
  type HealthStatus,
} from '@/core/finance';
import type { CurrencyCode } from '@/core/money';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Card, Divider, Icon, Section, Text, type IconName } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { loadForecastInput } from './MonthInsights';

async function loadHealth(repositories: Repositories, today: CalendarDate, currency: CurrencyCode) {
  const forecast = await loadForecastInput(repositories, today, currency);
  const accounts = await repositories.accounts.listWithBalances();
  const categories = await repositories.categories.list('expense');
  return buildFinancialHealth({
    currency,
    accounts,
    history: forecast.history,
    subscriptions: forecast.subscriptions,
    essentialCategoryIds: new Set(
      categories.filter((category) => category.essential).map((category) => category.id),
    ),
  });
}

const STATUS: Record<
  HealthStatus,
  { icon: IconName; tone: 'positive' | 'warning' | 'negative' | 'tertiary' }
> = {
  good: { icon: 'checkmark-circle', tone: 'positive' },
  fair: { icon: 'remove-circle', tone: 'warning' },
  attention: { icon: 'alert-circle', tone: 'negative' },
  noData: { icon: 'ellipse-outline', tone: 'tertiary' },
};

/**
 * "Saúde financeira": três pilares com o valor, o estado e o que fazer. Calculado em
 * `core/finance/health.ts`; sem dados suficientes, diz o que falta registar.
 */
export function FinancialHealthCard({
  today,
  currency,
}: {
  today: CalendarDate;
  currency: CurrencyCode;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatPercent } = useLocaleFormat();
  const [showCalculation, setShowCalculation] = useState(false);
  const query = useDataQuery(
    useCallback(
      (repositories: Repositories) => loadHealth(repositories, today, currency),
      [today, currency],
    ),
  );
  if (!query.data) return null;
  const health = query.data;

  const valueText = (pillar: HealthPillar): string | null => {
    if (pillar.value === null) return null;
    switch (pillar.key) {
      case 'savingsRate':
        return formatPercent(pillar.value, 0);
      case 'emergencyFund':
        return pillar.value < 1
          ? t('health.lessThanMonth')
          : t('health.months', { count: Math.floor(pillar.value) });
      case 'fixedCosts':
        return t('health.ofIncome', { percent: formatPercent(pillar.value, 0) });
    }
  };

  return (
    <Section title={t('health.title')}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text variant="title3">{t(`health.overall.${health.overall}`)}</Text>
          <Text variant="footnote" tone="secondary">
            {t('health.lead')}
          </Text>
        </View>
        {health.pillars.map((pillar) => {
          const { icon, tone } = STATUS[pillar.status];
          const value = valueText(pillar);
          return (
            <View key={pillar.key}>
              <Divider />
              <View
                style={styles.pillar}
                accessible
                accessibilityLabel={[
                  t(`health.${pillar.key}.title`),
                  value,
                  t(`health.status.${pillar.status}`),
                  t(`health.${pillar.key}.${pillar.status}`),
                ]
                  .filter(Boolean)
                  .join('. ')}>
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor:
                        tone === 'tertiary' ? colors.surfaceMuted : colors[`${tone}Muted`],
                    },
                  ]}>
                  <Icon name={icon} size={18} color={tone === 'tertiary' ? 'textTertiary' : tone} />
                </View>
                <View style={styles.body}>
                  <View style={styles.line}>
                    <Text variant="label" style={styles.flex}>
                      {t(`health.${pillar.key}.title`)}
                    </Text>
                    {value ? (
                      <Text variant="label" tabular>
                        {value}
                      </Text>
                    ) : null}
                  </View>
                  <Text variant="footnote" tone="secondary">
                    {t(`health.${pillar.key}.${pillar.status}`)}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
        {showCalculation ? (
          <View style={styles.definitions}>
            {health.pillars.map((pillar) => (
              <Text key={pillar.key} variant="footnote" tone="secondary">
                {pillar.key === 'emergencyFund' && pillar.basis === 'essentialExpenses'
                  ? t('health.definitions.emergencyFundEssential')
                  : t(`health.definitions.${pillar.key}`)}
              </Text>
            ))}
          </View>
        ) : null}
        <View style={styles.footer}>
          <Text variant="caption" tone="tertiary" style={styles.flex}>
            {t('health.disclaimer')}
          </Text>
          <Button
            label={t(showCalculation ? 'health.hideCalculation' : 'health.howCalculated')}
            variant="ghost"
            size="sm"
            onPress={() => setShowCalculation((value) => !value)}
          />
        </View>
      </Card>
    </Section>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  pillar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  definitions: {
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
