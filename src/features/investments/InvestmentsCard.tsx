import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { isStale, T212_POLL_MS } from '@/core/investments/trading212';
import { useLocaleFormat } from '@/i18n';
import { Badge, Card, Icon, Text } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { t212Enabled } from './Trading212Screen';
import { useRepositories } from '@/data';

import { loadT212, readT212Link, type T212Link, type T212State } from './trading212-sync';

/**
 * Investimentos ligados (Trading 212) no Dashboard: valor da conta, ganho/perda por realizar e a
 * hora da leitura. Nunca apresenta valores antigos como atuais: passa a "desatualizado" após 15 min.
 */
export function InvestmentsCard() {
  const { t } = useTranslation();
  const { formatMoney, formatPercent } = useLocaleFormat();
  const { client, state: auth } = useAuth();
  const repositories = useRepositories();
  const [state, setState] = useState<(T212State & { linked: T212Link['status'] }) | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!t212Enabled() || !client || auth.status !== 'signedIn') return;
    let alive = true;
    const read = async () => {
      const [next, link] = await Promise.all([loadT212(client), readT212Link(repositories)]);
      if (!alive) return;
      setState({ ...next, linked: link.status });
      setNow(Date.now());
    };
    void read().catch(() => undefined);
    // A atualização em segundo plano (T212Sync) traz dados novos; aqui só se volta a ler.
    const timer = setInterval(() => void read().catch(() => undefined), T212_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [client, auth.status, repositories]);

  if (!state?.integration || !state.snapshot) return null;
  const { snapshot, integration } = state;
  const money = (amountMinor: number) => formatMoney({ amountMinor, currency: snapshot.currency });
  const stale = isStale(snapshot.takenAt, now);
  const minutes = Math.max(0, Math.round((now - Date.parse(snapshot.takenAt)) / 60_000));
  const status =
    integration.status === 'error'
      ? { label: t('t212.statusError'), tone: 'negative' as const }
      : stale
        ? { label: t('t212.statusStale'), tone: 'warning' as const }
        : { label: t('t212.statusLive'), tone: 'positive' as const };

  return (
    <Card
      onPress={() => router.push('/integrations/trading212' as Href)}
      accessibilityLabel={`${t('t212.title')}, ${money(snapshot.total)}, ${status.label}`}>
      <View style={styles.body}>
        <View style={styles.row}>
          <Icon name="trending-up-outline" size={18} color="primaryText" />
          <Text variant="title3" style={styles.flex}>
            {t('dashboard.investments.title')}
          </Text>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <Text variant="footnote" tone="secondary">
          {t('t212.title')}
        </Text>
        <Text variant="title1" tabular>
          {money(snapshot.total)}
        </Text>
        <Text variant="footnote" tone={snapshot.unrealized >= 0 ? 'positive' : 'negative'} tabular>
          {t('dashboard.investments.unrealized', {
            amount: money(snapshot.unrealized),
            percent:
              snapshot.cost > 0 ? formatPercent(snapshot.unrealized / snapshot.cost, 1) : '—',
          })}
        </Text>
        <Text variant="caption" tone="tertiary">
          {minutes === 0 ? t('t212.updatedNow') : t('t212.updated', { count: minutes })}
        </Text>
        {state.linked === 'unlinked' ? (
          <Text variant="footnote" tone="warning">
            {t('dashboard.investments.chooseItem')}
          </Text>
        ) : state.linked === 'ambiguous' ? (
          <Text variant="footnote" tone="warning">
            {t('dashboard.investments.ambiguous')}
          </Text>
        ) : state.linked === 'notCounted' ? (
          <Text variant="caption" tone="tertiary">
            {t('dashboard.investments.notCounted')}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
});
