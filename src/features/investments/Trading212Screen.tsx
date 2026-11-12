import { Fragment, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { isStale, T212_POLL_MS, type T212Snapshot } from '@/core/investments/trading212';
import { useDataQuery, useRepositories, type Repositories } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { appStorage } from '@/lib/storage/key-value-store';
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipGroup,
  Dialog,
  Divider,
  FormScreen,
  Text,
  TextField,
} from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';
import { useToday } from '../finance/useToday';

/** Só aparece quando a função `t212` e o segredo INTEGRATIONS_KEY estão no servidor (ADR-064). */
export function t212Enabled(): boolean {
  return process.env.EXPO_PUBLIC_T212_ENABLED === 'true';
}

const LINK_KEY = 't212.wealthItemId';
type Integration = {
  status: 'connected' | 'error';
  environment: 'live' | 'demo';
  last_sync_at: string | null;
  last_error: string | null;
};
type State = { integration: Integration | null; snapshot: T212Snapshot | null };

export function Trading212Screen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatMoney, formatPercent, formatNumber } = useLocaleFormat();
  const { client } = useAuth();
  const repositories = useRepositories();
  const today = useToday();
  const [state, setState] = useState<State | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'demo'>('live');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const investments = useDataQuery(
    useCallback(
      async (repos: Repositories) =>
        (await repos.wealth.list()).filter((item) => item.type === 'investment' && !item.closedOn),
      [],
    ),
  );

  /** Estado e último retrato (RLS: só os da própria pessoa). */
  const load = useCallback(async (): Promise<State | null> => {
    if (!client) return null;
    const [integration, snapshot] = await Promise.all([
      client
        .from('integrations')
        .select('status, environment, last_sync_at, last_error')
        .eq('provider', 'trading212')
        .maybeSingle(),
      client.from('investment_snapshots').select('data').eq('provider', 'trading212').maybeSingle(),
    ]);
    return {
      integration: (integration.data as Integration | null) ?? null,
      snapshot: ((snapshot.data as { data: T212Snapshot } | null)?.data ??
        null) as T212Snapshot | null,
    };
  }, [client]);

  /** O valor da conta entra no património pelo item escolhido (uma só vez: nunca dois itens). */
  const syncWealth = useCallback(
    async (snapshot: T212Snapshot | null, linkedId: string | null) => {
      if (!snapshot || !linkedId || linkedId === 'none') return;
      const item = await repositories.wealth.get(linkedId);
      if (!item || item.closedOn || item.currency !== snapshot.currency) return;
      if (item.amount === snapshot.total && item.valuedOn === today) return;
      await repositories.wealth.update(item.id, {
        name: item.name,
        type: item.type,
        amount: snapshot.total,
        currency: item.currency,
        valuedOn: today,
      });
    },
    [repositories, today],
  );

  const refresh = useCallback(
    async (force: boolean) => {
      if (!client) return;
      let next = await load();
      // Sem conta ligada não há nada a atualizar (nem erro a mostrar).
      if (force && next?.integration) {
        const { error: failure } = await client.functions.invoke('t212', {
          method: 'POST',
          body: { action: 'refresh' },
        });
        setError(failure ? 'refreshFailed' : null);
        next = await load();
      }
      setState(next);
      setNow(Date.now());
      const linkedId = await appStorage.getItem(LINK_KEY).catch(() => null);
      setLink(linkedId);
      await syncWealth(next?.snapshot ?? null, linkedId).catch(() => undefined);
    },
    [client, load, syncWealth],
  );

  // Ao abrir e a cada minuto com o ecrã aberto (a função recusa pedidos a menos de 10 s).
  useEffect(() => {
    let alive = true;
    const tick = () => {
      if (alive) void refresh(true).catch(() => undefined);
    };
    tick();
    const timer = setInterval(tick, T212_POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [refresh]);

  const connect = async () => {
    if (!client) return;
    setBusy(true);
    setError(null);
    const { error: failure } = await client.functions.invoke('t212', {
      method: 'POST',
      body: { action: 'connect', apiKey, apiSecret, environment },
    });
    setBusy(false);
    if (failure) {
      const status = (failure as { context?: { status?: number } }).context?.status;
      setError(status === 400 ? 'connectRejected' : 'unavailable');
      return;
    }
    // As credenciais não ficam na app: os campos esvaziam logo.
    setApiKey('');
    setApiSecret('');
    await refresh(false);
  };

  const disconnect = async () => {
    setConfirmDisconnect(false);
    if (!client) return;
    setBusy(true);
    await client.functions.invoke('t212', { method: 'POST', body: { action: 'disconnect' } });
    await appStorage.removeItem(LINK_KEY).catch(() => undefined);
    setBusy(false);
    await refresh(false);
  };

  const chooseLink = async (value: string) => {
    if (value === 'create' && state?.snapshot) {
      const created = await repositories.wealth.create({
        name: t('t212.title'),
        type: 'investment',
        amount: state.snapshot.total,
        currency: state.snapshot.currency,
        valuedOn: today,
      });
      value = created.id;
    }
    await appStorage.setItem(LINK_KEY, value).catch(() => undefined);
    setLink(value);
    await syncWealth(state?.snapshot ?? null, value).catch(() => undefined);
  };

  const snapshot = state?.snapshot ?? null;
  const integration = state?.integration ?? null;
  const money = (amountMinor: number) =>
    formatMoney({ amountMinor, currency: snapshot?.currency ?? 'EUR' });
  const stale = isStale(snapshot?.takenAt ?? null, now);
  const ago = snapshot
    ? Math.max(0, Math.round((now - Date.parse(snapshot.takenAt)) / 60_000))
    : null;

  return (
    <FormScreen
      title={t('t212.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/settings')}>
      {!state ? (
        <ActivityIndicator color={colors.primary} />
      ) : !integration ? (
        <View style={styles.body}>
          <Text variant="callout" tone="secondary">
            {t('t212.intro')}
          </Text>
          <Text variant="footnote" tone="tertiary">
            {t('t212.howToKey')}
          </Text>
          <ChipGroup label={t('t212.account')}>
            <Chip
              label={t('t212.live')}
              selected={environment === 'live'}
              onPress={() => setEnvironment('live')}
            />
            <Chip
              label={t('t212.demo')}
              selected={environment === 'demo'}
              onPress={() => setEnvironment('demo')}
            />
          </ChipGroup>
          <TextField
            label={t('t212.apiKey')}
            value={apiKey}
            onChangeText={setApiKey}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <TextField
            label={t('t212.apiSecret')}
            value={apiSecret}
            onChangeText={setApiSecret}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          {error ? (
            <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
              {t(`t212.errors.${error}` as 't212.errors.unavailable')}
            </Text>
          ) : null}
          <Button
            label={t('t212.connect')}
            icon="link-outline"
            loading={busy}
            disabled={busy || apiKey.trim().length < 8}
            onPress={() => void connect()}
          />
          <Text variant="footnote" tone="tertiary">
            {t('t212.privacy')}
          </Text>
        </View>
      ) : (
        <View style={styles.body}>
          <Card>
            <View style={styles.section}>
              <View style={styles.row}>
                <Text variant="footnote" tone="secondary" style={styles.flex}>
                  {snapshot && ago !== null
                    ? t('t212.updated', { minutes: ago })
                    : t('t212.noData')}
                </Text>
                <Badge
                  label={
                    integration.status === 'error'
                      ? t('t212.statusError')
                      : stale
                        ? t('t212.statusStale')
                        : t('t212.statusLive')
                  }
                  tone={
                    integration.status === 'error' ? 'negative' : stale ? 'warning' : 'positive'
                  }
                />
              </View>
              {integration.status === 'error' && integration.last_error ? (
                <Text variant="footnote" tone="negative">
                  {t(`t212.errors.${integration.last_error}` as 't212.errors.unavailable')}
                </Text>
              ) : null}
              {snapshot ? (
                <>
                  <Text variant="footnote" tone="secondary">
                    {t('t212.total')}
                  </Text>
                  <Text variant="amountHero" tabular>
                    {money(snapshot.total)}
                  </Text>
                  <View style={styles.figures}>
                    <Figure label={t('t212.cash')}>{money(snapshot.cashAvailable)}</Figure>
                    <Figure label={t('t212.invested')}>{money(snapshot.invested)}</Figure>
                    <Figure label={t('t212.cost')}>{money(snapshot.cost)}</Figure>
                    <Figure label={t('t212.unrealized')}>
                      {`${money(snapshot.unrealized)}${snapshot.cost > 0 ? ` · ${formatPercent(snapshot.unrealized / snapshot.cost, 1)}` : ''}`}
                    </Figure>
                    {snapshot.realized !== null ? (
                      <Figure label={t('t212.realized')}>{money(snapshot.realized)}</Figure>
                    ) : null}
                  </View>
                  <Text variant="footnote" tone="tertiary">
                    {t('t212.currencyNote', { currency: snapshot.currency })}
                  </Text>
                </>
              ) : null}
              <Button
                label={t('t212.refresh')}
                variant="secondary"
                icon="refresh"
                disabled={busy}
                onPress={() => void refresh(true)}
              />
            </View>
          </Card>

          {snapshot && snapshot.positions.length > 0 ? (
            <Card padding="md">
              <View style={styles.section}>
                <Text variant="title3">{t('t212.positions')}</Text>
                {snapshot.positions.map((position, index) => (
                  <Fragment key={position.ticker}>
                    {index > 0 ? <Divider /> : null}
                    <View style={styles.row}>
                      <View style={styles.flex}>
                        <Text variant="bodyStrong" numberOfLines={1}>
                          {position.name}
                        </Text>
                        <Text variant="footnote" tone="secondary">
                          {t('t212.positionLine', {
                            quantity: formatNumber(position.quantity),
                            price: `${formatNumber(position.currentPrice)} ${position.instrumentCurrency}`,
                          })}
                        </Text>
                      </View>
                      <View style={styles.right}>
                        <Text variant="bodyStrong" tabular>
                          {money(position.value)}
                        </Text>
                        <Text
                          variant="footnote"
                          tone={position.unrealized >= 0 ? 'positive' : 'negative'}
                          tabular>
                          {money(position.unrealized)}
                        </Text>
                      </View>
                    </View>
                  </Fragment>
                ))}
              </View>
            </Card>
          ) : null}

          {snapshot ? (
            <Card>
              <View style={styles.section}>
                <Text variant="title3">{t('t212.netWorth')}</Text>
                <Text variant="footnote" tone="tertiary">
                  {t('t212.netWorthHint')}
                </Text>
                <ChipGroup label={t('t212.netWorthItem')}>
                  <Chip
                    label={t('t212.notCounted')}
                    selected={!link || link === 'none'}
                    onPress={() => void chooseLink('none')}
                  />
                  {(investments.data ?? [])
                    .filter((item) => item.currency === snapshot.currency)
                    .map((item) => (
                      <Chip
                        key={item.id}
                        label={item.name}
                        selected={link === item.id}
                        onPress={() => void chooseLink(item.id)}
                      />
                    ))}
                  <Chip
                    label={t('t212.createItem')}
                    icon="add"
                    selected={false}
                    onPress={() => void chooseLink('create')}
                  />
                </ChipGroup>
              </View>
            </Card>
          ) : null}

          <Button
            label={t('t212.disconnect')}
            variant="destructive"
            icon="unlink-outline"
            disabled={busy}
            onPress={() => setConfirmDisconnect(true)}
          />
        </View>
      )}
      <Dialog
        visible={confirmDisconnect}
        title={t('t212.disconnectTitle')}
        message={t('t212.disconnectMessage')}
        onDismiss={() => setConfirmDisconnect(false)}
        actions={[
          { label: t('t212.disconnect'), variant: 'destructive', onPress: () => void disconnect() },
          {
            label: t('common.cancel'),
            variant: 'secondary',
            onPress: () => setConfirmDisconnect(false),
          },
        ]}
      />
    </FormScreen>
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
  body: { gap: spacing.lg },
  section: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  figures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  figure: { gap: spacing.xs, minWidth: 120 },
});
