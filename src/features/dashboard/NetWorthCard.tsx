import { router } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { netWorthSummary } from '@/core/finance';
import { useDataQuery, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Button, Card, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

/**
 * "Estou a evoluir?": património líquido, investido e dívida total na moeda principal.
 * Valores reais (contas e últimas avaliações), nunca estimativas.
 */
export function NetWorthCard({ currency }: { currency: string }) {
  const { t } = useTranslation();
  const { formatMoney } = useLocaleFormat();
  const query = useDataQuery(
    useCallback(async (repositories: Repositories) => {
      const [accounts, items] = await Promise.all([
        repositories.accounts.listWithBalances(),
        repositories.wealth.list(),
      ]);
      return { accounts: accounts.filter((account) => !account.archivedAt), items };
    }, []),
  );
  if (!query.data) return null;
  const summary = netWorthSummary(query.data.accounts, query.data.items, currency);
  // Sem património registado nem dívidas, o cartão repetiria o saldo: não aparece.
  if (summary.assets === 0 && summary.debt === 0) return null;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency });

  return (
    <Card>
      <View style={styles.body}>
        <Text variant="title3">{t('dashboard.netWorth.title')}</Text>
        <Text variant="title1" tabular tone={summary.net < 0 ? 'negative' : 'primary'}>
          {money(summary.net)}
        </Text>
        <View style={styles.figures}>
          <Figure label={t('dashboard.netWorth.available')}>{money(summary.available)}</Figure>
          <Figure label={t('dashboard.netWorth.invested')}>{money(summary.invested)}</Figure>
          <Figure label={t('dashboard.netWorth.debt')}>{money(summary.debt)}</Figure>
        </View>
        <Text variant="footnote" tone="tertiary">
          {t('dashboard.netWorth.hint', { currency })}
        </Text>
        <Button
          label={t('dashboard.netWorth.open')}
          variant="ghost"
          icon="chevron-forward"
          onPress={() => router.push('/wealth')}
        />
      </View>
    </Card>
  );
}

function Figure({ label, children }: { label: string; children: string }) {
  return (
    <View style={styles.figure}>
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <Text variant="bodyStrong" tabular>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.sm },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  figure: { gap: spacing.xs, minWidth: 110 },
});
