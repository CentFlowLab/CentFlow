import { router, type Href } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calendarDateToLocalDate, remainingAmountMinor, savedAmountMinor } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Amount,
  Button,
  Card,
  EmptyState,
  IconButton,
  ListItem,
  ProgressBar,
  Screen,
  Text,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

async function load(repositories: Repositories) {
  const goals = await repositories.goals.list();
  const contributions = await Promise.all(
    goals.map((goal) => repositories.goals.listContributions(goal.id)),
  );
  return goals.map((goal, index) => ({
    goal,
    savedMinor: savedAmountMinor((contributions[index] ?? []).map((item) => item.amount)),
  }));
}

export function GoalsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDate, formatMoney } = useLocaleFormat();
  const query = useDataQuery(useCallback((repositories: Repositories) => load(repositories), []));

  const header = {
    title: t('nav.goals'),
    subtitle: t('goals.subtitle'),
    headerRight: (
      <IconButton
        icon="add"
        variant="filled"
        accessibilityLabel={t('goals.add')}
        onPress={() => router.push('/goal/new' as Href)}
      />
    ),
  };

  if (!query.data) {
    return (
      <Screen {...header}>
        {query.status === 'error' ? (
          <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
        ) : (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        )}
      </Screen>
    );
  }

  return (
    <Screen {...header}>
      <View style={styles.body}>
        {query.data.length === 0 ? (
          <EmptyState
            icon="flag-outline"
            title={t('goals.emptyTitle')}
            description={t('goals.emptyDescription')}>
            <Button label={t('goals.start')} onPress={() => router.push('/goal/new' as Href)} />
          </EmptyState>
        ) : (
          <Card padding="xs">
            {query.data.map(({ goal, savedMinor }) => {
              const reached = savedMinor >= goal.targetAmount;
              return (
                <ListItem
                  key={goal.id}
                  title={goal.name}
                  subtitle={
                    goal.targetOn
                      ? formatDate(calendarDateToLocalDate(goal.targetOn), 'medium')
                      : t('goals.noDate')
                  }
                  icon="flag-outline"
                  onPress={() => router.push(`/goal/${goal.id}` as Href)}
                  trailing={
                    <View style={styles.trailing}>
                      <Amount
                        value={{ amountMinor: savedMinor, currency: goal.currency }}
                        variant="amount"
                      />
                      <Text variant="caption" tone="tertiary">
                        {t('goals.target')}
                      </Text>
                      <Amount
                        value={{ amountMinor: goal.targetAmount, currency: goal.currency }}
                        variant="label"
                      />
                      <ProgressBar
                        progress={goal.targetAmount === 0 ? 0 : savedMinor / goal.targetAmount}
                        tone={reached ? 'positive' : 'accent'}
                        accessibilityLabel={
                          reached
                            ? t('goals.reached')
                            : `${t('goals.remaining')} ${formatMoney({
                                amountMinor: remainingAmountMinor(goal.targetAmount, savedMinor),
                                currency: goal.currency,
                              })}`
                        }
                      />
                    </View>
                  }
                />
              );
            })}
          </Card>
        )}
        <Text variant="caption" tone="tertiary">
          {t('goals.doesNotChangeBalances')}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { marginTop: spacing.xl },
  body: { gap: spacing.lg },
  trailing: { alignItems: 'flex-end', gap: spacing.xxs, minWidth: 120 },
});
