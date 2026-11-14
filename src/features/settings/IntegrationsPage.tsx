import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/features/account/AuthProvider';
import { loadBankConnections, type BankConnection } from '@/features/banking/open-banking-client';
import { t212Enabled } from '@/features/investments/Trading212Screen';
import { loadT212, type T212State } from '@/features/investments/trading212-sync';
import { useLocaleFormat } from '@/i18n';
import {
  Badge,
  Button,
  Card,
  Divider,
  Icon,
  Text,
  type BadgeTone,
  type IconName,
} from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { SettingsGroup, SettingsPageHeader } from './SettingsBlocks';

const BANK_TONE: Record<BankConnection['status'], BadgeTone> = {
  connected: 'positive',
  expired: 'warning',
  error: 'negative',
};

/**
 * Definições › Integrações: um painel por integração com o estado real (lido do servidor ao
 * abrir a página), o que pode ler e as ações. A ligação e a gestão continuam nos ecrãs próprios
 * de cada integração.
 */
export function IntegrationsPage() {
  const { t } = useTranslation();
  const { client, state } = useAuth();
  const signedIn = state.status === 'signedIn';
  const [banks, setBanks] = useState<BankConnection[] | null | 'failed'>(null);
  const [t212, setT212] = useState<T212State | null | 'failed'>(null);
  const showT212 = t212Enabled();

  // Volta a ler ao regressar dos ecrãs de cada integração (ligar, desligar, atualizar).
  useFocusEffect(
    useCallback(() => {
      if (!client || !signedIn) return;
      let alive = true;
      void loadBankConnections(client).then((value) => {
        if (alive) setBanks(value ?? 'failed');
      });
      if (showT212) {
        loadT212(client)
          .then((value) => {
            if (alive) setT212(value);
          })
          .catch(() => {
            if (alive) setT212('failed');
          });
      }
      return () => {
        alive = false;
      };
    }, [client, signedIn, showT212]),
  );

  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.integrations.title')}
        description={t('settings.sections.integrations.description')}
      />
      {!signedIn ? (
        <Text variant="callout" tone="secondary">
          {t('settings.integrationsPage.signedOut')}
        </Text>
      ) : (
        <SettingsGroup plain>
          <View style={styles.list}>
            <BanksPanel state={banks} />
            {showT212 ? <Trading212Panel state={t212} /> : null}
          </View>
        </SettingsGroup>
      )}
    </>
  );
}

/** Cabeçalho comum: ícone, nome, o que é e o estado em destaque. */
function PanelHead({
  icon,
  title,
  subtitle,
  status,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  status: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.head}>
      <View style={[styles.headIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name={icon} size={22} color="primaryText" />
      </View>
      <View style={styles.headText}>
        <Text variant="title3" accessibilityRole="header">
          {title}
        </Text>
        <Text variant="footnote" tone="secondary">
          {subtitle}
        </Text>
      </View>
      {status}
    </View>
  );
}

/** Informação factual de uma integração (permissões, quando atualiza). */
function Detail({ icon, children }: { icon: IconName; children: ReactNode }) {
  return (
    <View style={styles.detail}>
      <Icon name={icon} size={16} color="textTertiary" />
      <Text variant="footnote" tone="secondary" style={styles.detailText}>
        {children}
      </Text>
    </View>
  );
}

function Loading() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.primary} accessibilityLabel={t('common.loading')} />
      <Text variant="footnote" tone="secondary">
        {t('settings.integrationsPage.loading')}
      </Text>
    </View>
  );
}

function BanksPanel({ state }: { state: BankConnection[] | null | 'failed' }) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatDateTime } = useLocaleFormat();
  const connections = Array.isArray(state) ? state : [];
  const active = connections.filter((connection) => connection.status === 'connected').length;

  return (
    <Card padding="lg">
      <View style={styles.panel}>
        <PanelHead
          icon="business-outline"
          title={t('settings.integrationsPage.banks.title')}
          subtitle={t('settings.integrationsPage.banks.subtitle')}
          status={
            Array.isArray(state) ? (
              <Badge
                tone={active > 0 ? 'positive' : 'neutral'}
                label={
                  active > 0
                    ? t('settings.integrationsPage.banks.connected', { count: active })
                    : t('settings.integrationsPage.readOnly')
                }
              />
            ) : null
          }
        />

        <View style={[styles.notice, { backgroundColor: colors.warningMuted }]}>
          <Icon name="flask-outline" size={16} color="warning" />
          <Text variant="footnote" style={styles.detailText}>
            {t('settings.integrationsPage.banks.limited')}
          </Text>
        </View>

        {state === null ? (
          <Loading />
        ) : state === 'failed' ? (
          <Text variant="footnote" tone="negative">
            {t('settings.integrationsPage.loadFailed')}
          </Text>
        ) : connections.length === 0 ? (
          <Text variant="callout" tone="secondary">
            {t('settings.integrationsPage.banks.none')}
          </Text>
        ) : (
          <View
            style={[styles.connections, { borderColor: colors.border }]}
            accessibilityRole="list">
            {connections.map((connection, index) => (
              <View key={connection.id}>
                {index > 0 ? <Divider /> : null}
                <View style={styles.connection} accessibilityRole="none">
                  <View style={styles.headText}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {connection.aspsp_name}
                    </Text>
                    <Text variant="footnote" tone="secondary" numberOfLines={1}>
                      {[
                        t('settings.integrationsPage.banks.accounts', {
                          count: connection.accounts.length,
                        }),
                        connection.last_sync_at
                          ? t('banking.lastSync', {
                              date: formatDateTime(new Date(connection.last_sync_at)),
                            })
                          : t('banking.neverSynced'),
                      ].join(' · ')}
                    </Text>
                    {connection.last_error === 'rateLimited' ? (
                      <Text variant="footnote" tone="warning">
                        {t('banking.errors.rateLimited')}
                      </Text>
                    ) : null}
                  </View>
                  <Badge
                    tone={BANK_TONE[connection.status]}
                    label={t(`banking.status.${connection.status}`)}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.details}>
          <Detail icon="eye-outline">{t('settings.integrationsPage.banks.permissions')}</Detail>
          <Detail icon="time-outline">{t('settings.integrationsPage.banks.refresh')}</Detail>
        </View>

        <View style={styles.actions}>
          <Button
            label={t('settings.integrationsPage.banks.manage')}
            size="sm"
            onPress={() => router.push('/integrations/banks' as Href)}
          />
          <Button
            label={t('settings.integrationsPage.banks.link')}
            icon="add"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/integrations/bank-link' as Href)}
          />
        </View>
      </View>
    </Card>
  );
}

function Trading212Panel({ state }: { state: T212State | null | 'failed' }) {
  const { t } = useTranslation();
  const { formatDateTime, formatMoney } = useLocaleFormat();
  const integration = state && state !== 'failed' ? state.integration : null;
  const snapshot = state && state !== 'failed' ? state.snapshot : null;

  const badge =
    state === null || state === 'failed' ? null : !integration ? (
      <Badge tone="neutral" label={t('settings.integrationsPage.readOnly')} />
    ) : integration.status === 'connected' ? (
      <Badge tone="positive" label={t('settings.integrationsPage.t212.connected')} />
    ) : (
      <Badge tone="negative" label={t('settings.integrationsPage.t212.error')} />
    );

  return (
    <Card padding="lg">
      <View style={styles.panel}>
        <PanelHead
          icon="trending-up-outline"
          title={t('settings.integrationsPage.t212.title')}
          subtitle={t('settings.integrationsPage.t212.subtitle')}
          status={badge}
        />

        {state === null ? (
          <Loading />
        ) : state === 'failed' ? (
          <Text variant="footnote" tone="negative">
            {t('settings.integrationsPage.loadFailed')}
          </Text>
        ) : !integration ? (
          <Text variant="callout" tone="secondary">
            {t('settings.integrationsPage.t212.notConnected')}
          </Text>
        ) : (
          <View style={styles.facts}>
            <View style={styles.fact}>
              <Text variant="footnote" tone="secondary">
                {integration.environment === 'demo'
                  ? t('settings.integrationsPage.t212.demo')
                  : t('settings.integrationsPage.t212.live')}
              </Text>
              <Text variant="footnote" tone="secondary">
                {integration.last_sync_at
                  ? t('banking.lastSync', {
                      date: formatDateTime(new Date(integration.last_sync_at)),
                    })
                  : t('banking.neverSynced')}
              </Text>
            </View>
            {snapshot ? (
              <View style={styles.fact}>
                <Text variant="footnote" tone="secondary">
                  {t('settings.integrationsPage.t212.total')}
                </Text>
                <Text variant="amount" tabular>
                  {formatMoney({ amountMinor: snapshot.total, currency: snapshot.currency })}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.details}>
          <Detail icon="eye-outline">{t('settings.integrationsPage.t212.permissions')}</Detail>
          <Detail icon="time-outline">{t('settings.integrationsPage.t212.refresh')}</Detail>
        </View>

        <View style={styles.actions}>
          <Button
            label={
              integration
                ? t('settings.integrationsPage.t212.open')
                : t('settings.integrationsPage.t212.connect')
            }
            size="sm"
            variant={integration ? 'primary' : 'secondary'}
            onPress={() => router.push('/integrations/trading212' as Href)}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.lg,
  },
  panel: {
    gap: spacing.lg,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headText: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  connections: {
    borderWidth: 1,
    borderRadius: radius.md,
  },
  connection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  facts: {
    gap: spacing.sm,
  },
  fact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  details: {
    gap: spacing.xs,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  detailText: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
