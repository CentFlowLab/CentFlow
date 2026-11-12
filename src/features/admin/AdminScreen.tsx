import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useLocaleFormat } from '@/i18n';
import { Card, EmptyState, FormScreen, ListItem, Text } from '@/ui/components';
import { spacing, useTheme } from '@/ui/theme';

import { useAuth } from '../account/AuthProvider';
import { closeModal } from '../finance/navigation';

export type AdminRole = 'technical' | 'support' | 'product';

/**
 * Papel administrativo da sessão, decidido no servidor (`admin_role()`, ADR-065). Sem função no
 * servidor (migração por aplicar) ou sem papel: `null`, e a app não mostra nada de administração.
 */
export function useAdminRole(): AdminRole | null {
  const { client, state } = useAuth();
  const [role, setRole] = useState<AdminRole | null>(null);
  useEffect(() => {
    if (!client || state.status !== 'signedIn') return;
    let alive = true;
    void (async () => {
      const { data, error } = await client.rpc('admin_role');
      if (alive) setRole(!error && typeof data === 'string' ? (data as AdminRole) : null);
    })();
    return () => {
      alive = false;
    };
  }, [client, state.status]);
  return role;
}

type Overview = {
  generatedAt: string;
  users: { total: number; new30d: number; syncing7d: number };
  records: { accounts: number; entries: number; documents: number; goals: number };
  integrations: Record<string, number>;
};
type AuditRow = { admin_id: string; role: string; action: string; at: string };

export function AdminScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { formatNumber, formatDate } = useLocaleFormat();
  const { client } = useAuth();
  const role = useAdminRole();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!client || !role) return;
    let alive = true;
    void (async () => {
      const result = await client.rpc('admin_overview');
      const log =
        role === 'technical' ? await client.rpc('admin_audit_log', { p_limit: 30 }) : null;
      if (!alive) return;
      if (result.error) setFailed(true);
      else setOverview(result.data as Overview);
      setAudit((log?.data as AuditRow[] | null) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [client, role]);

  const number = (value: number | undefined) => formatNumber(value ?? 0);

  return (
    <FormScreen
      title={t('admin.title')}
      closeLabel={t('common.close')}
      onClose={() => closeModal('/settings')}>
      {!role ? (
        <EmptyState
          icon="lock-closed-outline"
          title={t('admin.noAccess')}
          description={t('admin.noAccessHint')}
        />
      ) : failed ? (
        <EmptyState icon="alert-circle-outline" title={t('errors.loadFailed')} />
      ) : !overview ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.body}>
          <Text variant="footnote" tone="tertiary">
            {t('admin.scope', { role: t(`admin.roles.${role}`) })}
          </Text>
          <Card padding="xs">
            <ListItem
              icon="people-outline"
              title={t('admin.usersTotal')}
              trailing={<Value>{number(overview.users.total)}</Value>}
            />
            <ListItem
              icon="person-add-outline"
              title={t('admin.usersNew')}
              trailing={<Value>{number(overview.users.new30d)}</Value>}
            />
            <ListItem
              icon="sync-outline"
              title={t('admin.usersSyncing')}
              trailing={<Value>{number(overview.users.syncing7d)}</Value>}
            />
          </Card>
          <Card padding="xs">
            <ListItem
              icon="wallet-outline"
              title={t('admin.accounts')}
              trailing={<Value>{number(overview.records.accounts)}</Value>}
            />
            <ListItem
              icon="swap-vertical-outline"
              title={t('admin.entries')}
              trailing={<Value>{number(overview.records.entries)}</Value>}
            />
            <ListItem
              icon="document-outline"
              title={t('admin.documents')}
              trailing={<Value>{number(overview.records.documents)}</Value>}
            />
            <ListItem
              icon="flag-outline"
              title={t('admin.goals')}
              trailing={<Value>{number(overview.records.goals)}</Value>}
            />
          </Card>
          <Card padding="xs">
            <ListItem
              icon="trending-up-outline"
              title={t('admin.integrations')}
              subtitle={
                Object.keys(overview.integrations).length === 0
                  ? t('admin.none')
                  : Object.entries(overview.integrations)
                      .map(
                        ([status, total]) =>
                          `${t(`admin.integrationStatus.${status as 'connected' | 'error'}`)}: ${number(total)}`,
                      )
                      .join(' · ')
              }
            />
          </Card>
          <Text variant="footnote" tone="tertiary">
            {t('admin.notAvailable')}
          </Text>
          {role === 'technical' ? (
            <Card padding="md">
              <View style={styles.section}>
                <Text variant="title3">{t('admin.audit')}</Text>
                {audit.map((row, index) => (
                  <Text key={`${row.at}-${index}`} variant="footnote" tone="secondary">
                    {`${formatDate(new Date(row.at), 'short')} ${new Date(row.at).toLocaleTimeString().slice(0, 5)} · ${t(`admin.roles.${row.role as AdminRole}`)} · ${row.action} · ${row.admin_id.slice(0, 8)}`}
                  </Text>
                ))}
              </View>
            </Card>
          ) : null}
        </View>
      )}
    </FormScreen>
  );
}

function Value({ children }: { children: string }) {
  return (
    <Text variant="bodyStrong" tabular>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  section: { gap: spacing.xs },
});
