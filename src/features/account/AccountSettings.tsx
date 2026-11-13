import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { cancelImport, getImportState, type ImportState, type SyncStatus } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { Badge, Button, Card, Dialog, Icon, ListItem, Text } from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { useAdminRole } from '../admin/AdminScreen';
import { useActiveSpace } from '../app-shell/DataGate';
import {
  NEUTRAL_ICON,
  RowValue,
  SettingsGroup,
  SettingsPageHeader,
} from '../settings/SettingsBlocks';
import { useAuth, type AuthUser } from './AuthProvider';
import { useSync } from './SyncProvider';

const STATUS_TONE: Record<SyncStatus, 'positive' | 'neutral' | 'warning' | 'negative'> = {
  idle: 'positive',
  syncing: 'neutral',
  offline: 'warning',
  error: 'negative',
  authRequired: 'negative',
};

/** Inicial do nome (ou do email) para o avatar; sem foto. */
function initialOf(user: AuthUser): string {
  const source = user.username ?? user.email ?? '?';
  return source.charAt(0).toLocaleUpperCase();
}

/**
 * Definições › Conta e segurança: perfil, palavra-passe, sessão e, no fim e à parte, a gestão da
 * conta (exportar, eliminar — ADR-068). Sem sessão, só o convite para entrar.
 */
export function AccountSettingsPage() {
  const { t } = useTranslation();
  const { state } = useAuth();

  return (
    <>
      <SettingsPageHeader
        title={t('settings.sections.account.title')}
        description={t('settings.sections.account.description')}
      />
      {state.status === 'signedIn' ? (
        <SignedInAccount user={state.user} />
      ) : state.status === 'unavailable' ? (
        <Text variant="callout" tone="secondary">
          {t('account.localOnlyDescription')}
        </Text>
      ) : (
        <SignedOutAccount expired={state.status === 'signedOut' && state.expired} />
      )}
    </>
  );
}

function SignedOutAccount({ expired }: { expired: boolean }) {
  const { t } = useTranslation();
  return (
    <Card padding="lg">
      <View style={styles.stack}>
        <Text variant="bodyStrong">
          {expired ? t('account.sessionExpiredTitle') : t('account.localOnlyTitle')}
        </Text>
        <Text variant="callout" tone="secondary">
          {expired ? t('account.sessionExpiredMessage') : t('account.localOnlyDescription')}
        </Text>
        <View style={styles.row}>
          <Button label={t('auth.signIn')} onPress={() => router.push('/auth/sign-in' as Href)} />
          <Button
            label={t('auth.signUp')}
            variant="secondary"
            onPress={() => router.push('/auth/sign-up' as Href)}
          />
        </View>
      </View>
    </Card>
  );
}

type AccountDialog = 'signOutPending' | 'passwordSent' | 'passwordFailed' | null;

function SignedInAccount({ user }: { user: AuthUser }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { actions } = useAuth();
  const { snapshot, syncNow } = useSync();
  const adminRole = useAdminRole();
  const [dialog, setDialog] = useState<AccountDialog>(null);
  const [busy, setBusy] = useState(false);
  const pending = snapshot?.pending ?? 0;
  const name = user.username ? `@${user.username}` : (user.email ?? t('account.signedIn'));

  const signOut = async () => {
    setBusy(true);
    await actions.signOut();
    setBusy(false);
    setDialog(null);
  };

  const changePassword = async () => {
    if (!user.email || busy) return;
    setBusy(true);
    const result = await actions.requestPasswordReset(user.email);
    setBusy(false);
    setDialog(result.ok ? 'passwordSent' : 'passwordFailed');
  };

  return (
    <>
      <SettingsGroup title={t('settings.blocks.profile')}>
        <View
          style={styles.profile}
          accessible
          accessibilityLabel={user.email && user.username ? `${name}, ${user.email}` : name}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
            <Text variant="title2" tone="accent" accessibilityRole="text">
              {initialOf(user)}
            </Text>
          </View>
          <View style={styles.profileText}>
            <Text variant="title3" numberOfLines={1} accessibilityRole="text">
              {name}
            </Text>
            <Text variant="footnote" tone="secondary" numberOfLines={1}>
              {t('settings.profile.sessionHere')}
            </Text>
          </View>
        </View>
        {user.email ? (
          <ListItem
            {...NEUTRAL_ICON}
            icon="mail-outline"
            title={t('settings.profile.email')}
            trailing={<RowValue>{user.email}</RowValue>}
          />
        ) : null}
        {user.username ? (
          <ListItem
            {...NEUTRAL_ICON}
            icon="at-outline"
            title={t('settings.profile.username')}
            trailing={<RowValue>{user.username}</RowValue>}
          />
        ) : null}
      </SettingsGroup>

      {user.email ? (
        <SettingsGroup title={t('settings.blocks.security')}>
          <ListItem
            {...NEUTRAL_ICON}
            icon="key-outline"
            title={t('account.changePassword')}
            subtitle={t('account.changePasswordHint')}
            showChevron={false}
            trailing={busy ? <ActivityIndicator color={colors.primary} /> : null}
            onPress={() => void changePassword()}
          />
        </SettingsGroup>
      ) : null}

      <SettingsGroup title={t('settings.blocks.session')} note={t('settings.profile.signOutHint')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="log-out-outline"
          title={t('account.signOut')}
          showChevron={false}
          onPress={() => (pending > 0 ? setDialog('signOutPending') : void signOut())}
        />
      </SettingsGroup>

      {adminRole ? (
        <SettingsGroup title={t('settings.blocks.admin')}>
          <ListItem
            {...NEUTRAL_ICON}
            icon="shield-outline"
            title={t('admin.title')}
            subtitle={t(`admin.roles.${adminRole}`)}
            onPress={() => router.push('/admin' as Href)}
          />
        </SettingsGroup>
      ) : null}

      {/* Gestão da conta à parte e no fim: exportar e eliminar não são ações do dia a dia. */}
      <SettingsGroup title={t('settings.blocks.management')}>
        <ListItem
          {...NEUTRAL_ICON}
          icon="person-circle-outline"
          title={t('account.manage')}
          subtitle={t('settings.profile.manageHint')}
          onPress={() => router.push('/account-management' as Href)}
        />
      </SettingsGroup>

      <Dialog
        visible={dialog === 'signOutPending'}
        title={t('account.signOutPendingTitle')}
        message={t('account.signOutPendingMessage', { count: pending })}
        onDismiss={() => setDialog(null)}
        actions={[
          {
            label: t('account.syncAndSignOut'),
            loading: busy,
            onPress: async () => {
              setBusy(true);
              const result = await syncNow();
              if (result && result.pending === 0) await signOut();
              else setBusy(false);
            },
          },
          { label: t('account.signOutAnyway'), variant: 'secondary', onPress: signOut },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setDialog(null) },
        ]}
      />
      <Dialog
        visible={dialog === 'passwordSent'}
        title={t('account.changePasswordSentTitle')}
        message={t('account.changePasswordSentMessage', { email: user.email ?? '' })}
        onDismiss={() => setDialog(null)}
        actions={[{ label: t('common.ok'), onPress: () => setDialog(null) }]}
      />
      <Dialog
        visible={dialog === 'passwordFailed'}
        title={t('account.changePassword')}
        message={t('account.changePasswordFailed')}
        onDismiss={() => setDialog(null)}
        actions={[{ label: t('common.ok'), onPress: () => setDialog(null) }]}
      />
    </>
  );
}

/**
 * Estado da sincronização em destaque (estado, última vez, pendentes) e a ação de sincronizar,
 * com resposta visível. Conflitos e a importação de dados sem conta aparecem por baixo, quando
 * existem. Só com sessão iniciada.
 */
export function SyncStatusGroup() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { space, store } = useActiveSpace();
  const { snapshot, syncNow, offerImport } = useSync();
  const { formatDateTime } = useLocaleFormat();
  const [importState, setImportState] = useState<ImportState | null>(null);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<'done' | 'failed' | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (space.kind !== 'user') return;
    let active = true;
    void getImportState(store).then((value) => {
      if (active) setImportState(value);
    });
    return () => {
      active = false;
    };
  }, [space, store, snapshot]);

  const status = snapshot?.status ?? 'syncing';
  const pending = snapshot?.pending ?? 0;
  const conflicts = snapshot?.conflicts ?? 0;
  const lastSynced = snapshot?.lastSyncedAt
    ? t('account.lastSynced', { date: formatDateTime(new Date(snapshot.lastSyncedAt)) })
    : t('account.neverSynced');

  const run = async () => {
    setRunning(true);
    setFeedback(null);
    const result = await syncNow();
    setRunning(false);
    setFeedback(result && result.status === 'idle' ? 'done' : 'failed');
  };

  return (
    <SettingsGroup title={t('settings.blocks.sync')} plain>
      <Card padding="lg">
        <View style={styles.syncCard}>
          <View style={styles.syncHead}>
            <View style={[styles.syncIcon, { backgroundColor: colors.primaryMuted }]}>
              <Icon
                name={status === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'}
                size={22}
                color="primaryText"
              />
            </View>
            <View style={styles.profileText}>
              <Text variant="bodyStrong">{t(`account.status.${status}`)}</Text>
              <Text variant="footnote" tone="secondary">
                {pending > 0
                  ? `${t('account.pending', { count: pending })} · ${lastSynced}`
                  : lastSynced}
              </Text>
            </View>
            <Badge label={t(`account.statusShort.${status}`)} tone={STATUS_TONE[status]} />
          </View>
          <View style={styles.row}>
            <Button
              label={t('settings.data.syncNow')}
              icon="refresh"
              variant="secondary"
              size="sm"
              loading={running}
              onPress={() => void run()}
            />
          </View>
          {feedback ? (
            <Text
              variant="footnote"
              tone={feedback === 'done' ? 'positive' : 'negative'}
              accessibilityLiveRegion="polite">
              {feedback === 'done' ? t('settings.data.syncDone') : t('settings.data.syncFailed')}
            </Text>
          ) : null}
        </View>
      </Card>
      {conflicts > 0 ? (
        <SettingsGroup>
          <ListItem
            icon="git-compare-outline"
            iconColor="warning"
            iconBackground="warningMuted"
            title={t('account.conflicts', { count: conflicts })}
            subtitle={t('account.conflictsHint')}
            onPress={() => router.push('/sync/conflicts' as Href)}
          />
        </SettingsGroup>
      ) : null}
      {space.kind === 'user' && importState?.state === 'copied' ? (
        <SettingsGroup>
          <ListItem
            {...NEUTRAL_ICON}
            icon="close-circle-outline"
            title={t('account.cancelImport')}
            subtitle={t('account.importPending')}
            onPress={() => setConfirmCancel(true)}
            showChevron={false}
          />
        </SettingsGroup>
      ) : importState?.state === 'declined' ? (
        <SettingsGroup>
          <ListItem
            {...NEUTRAL_ICON}
            icon="download-outline"
            title={t('account.importData')}
            subtitle={t('account.importDataHint')}
            onPress={offerImport}
            showChevron={false}
          />
        </SettingsGroup>
      ) : null}
      <Dialog
        visible={confirmCancel}
        title={t('account.cancelImportTitle')}
        message={t('account.cancelImportMessage')}
        onDismiss={() => setConfirmCancel(false)}
        actions={[
          {
            label: t('account.cancelImport'),
            variant: 'destructive',
            onPress: async () => {
              await cancelImport(store);
              setConfirmCancel(false);
              setImportState(await getImportState(store));
              void syncNow();
            },
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setConfirmCancel(false) },
        ]}
      />
    </SettingsGroup>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: spacing.xxs,
  },
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  syncCard: {
    gap: spacing.md,
  },
  syncHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  syncIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
