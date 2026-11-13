import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { cancelImport, getImportState, type ImportState, type SyncStatus } from '@/data';
import { useLocaleFormat } from '@/i18n';
import {
  Badge,
  Button,
  Card,
  Dialog,
  Divider,
  Icon,
  ListItem,
  Section,
  Text,
} from '@/ui/components';
import { radius, spacing, useTheme } from '@/ui/theme';

import { useActiveSpace } from '../app-shell/DataGate';
import { useAuth, type AuthUser } from './AuthProvider';
import { useSync } from './SyncProvider';

type DialogKind = 'signOutPending' | 'cancelImport' | 'passwordSent' | 'passwordFailed' | null;

const STATUS_TONE: Record<SyncStatus, 'positive' | 'neutral' | 'warning' | 'negative'> = {
  idle: 'positive',
  syncing: 'neutral',
  offline: 'warning',
  error: 'negative',
  authRequired: 'negative',
};

/**
 * Definições: "Conta" e "Sincronização" no topo, seguidas das restantes secções (`children`).
 * Terminar sessão e a gestão da conta (exportar, eliminar) ficam no cartão da conta (ADR-068).
 */
export function AccountSettings({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { state } = useAuth();

  if (state.status === 'unavailable') return <>{children}</>;
  if (state.status !== 'signedIn') {
    const expired = state.status === 'signedOut' && state.expired;
    return (
      <>
        <Section title={t('settings.groups.account')}>
          <Card padding="lg">
            <View style={styles.stack}>
              <Text variant="bodyStrong">
                {expired ? t('account.sessionExpiredTitle') : t('account.localOnlyTitle')}
              </Text>
              <Text variant="callout" tone="secondary">
                {expired ? t('account.sessionExpiredMessage') : t('account.localOnlyDescription')}
              </Text>
              <View style={styles.row}>
                <Button
                  label={t('auth.signIn')}
                  onPress={() => router.push('/auth/sign-in' as Href)}
                />
                <Button
                  label={t('auth.signUp')}
                  variant="secondary"
                  onPress={() => router.push('/auth/sign-up' as Href)}
                />
              </View>
            </View>
          </Card>
        </Section>
        {children}
      </>
    );
  }

  return <SignedInAccount user={state.user}>{children}</SignedInAccount>;
}

/** Inicial do nome (ou do email) para o avatar; sem foto. */
function initialOf(user: AuthUser): string {
  const source = user.username ?? user.email ?? '?';
  return source.charAt(0).toLocaleUpperCase();
}

function SignedInAccount({ user, children }: { user: AuthUser; children: ReactNode }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { actions } = useAuth();
  const { space, store } = useActiveSpace();
  const { snapshot, syncNow, offerImport } = useSync();
  const { formatDateTime } = useLocaleFormat();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [importState, setImportState] = useState<ImportState | null>(null);

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

  const name = user.username ? `@${user.username}` : (user.email ?? t('account.signedIn'));

  return (
    <>
      <Section title={t('settings.groups.account')}>
        <Card padding="xs">
          <View
            style={styles.profile}
            accessible
            accessibilityLabel={user.email && user.username ? `${name}, ${user.email}` : name}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
              <Text variant="title3" tone="accent">
                {initialOf(user)}
              </Text>
            </View>
            <View style={styles.profileText}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="footnote" tone="secondary" numberOfLines={1}>
                {user.username && user.email ? user.email : t('account.signedIn')}
              </Text>
            </View>
          </View>
          {user.email ? (
            <>
              <Divider inset={spacing.lg} />
              <ListItem
                icon="key-outline"
                iconColor="textSecondary"
                iconBackground="surfaceMuted"
                title={t('account.changePassword')}
                subtitle={t('account.changePasswordHint')}
                showChevron={false}
                onPress={changePassword}
              />
            </>
          ) : null}
          <Divider inset={spacing.lg} />
          <ListItem
            icon="person-circle-outline"
            iconColor="textSecondary"
            iconBackground="surfaceMuted"
            title={t('account.manage')}
            subtitle={t('account.manageHint')}
            onPress={() => router.push('/account-management' as Href)}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            icon="log-out-outline"
            iconColor="textSecondary"
            iconBackground="surfaceMuted"
            title={t('account.signOut')}
            showChevron={false}
            onPress={() => (pending > 0 ? setDialog('signOutPending') : void signOut())}
          />
        </Card>
      </Section>

      <Section title={t('settings.groups.sync')}>
        <Card padding="xs">
          <ListItem
            icon={status === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'}
            iconColor="textSecondary"
            iconBackground="surfaceMuted"
            title={t(`account.status.${status}`)}
            subtitle={
              pending > 0
                ? `${t('account.pending', { count: pending })} · ${lastSynced}`
                : lastSynced
            }
            accessibilityHint={t('account.syncNow')}
            onPress={() => void syncNow()}
            showChevron={false}
            trailing={
              <View style={styles.syncTrailing}>
                <Badge label={t(`account.statusShort.${status}`)} tone={STATUS_TONE[status]} />
                {/* Tocar sincroniza: o ícone diz que a linha é uma ação. */}
                <Icon name="refresh" size={18} color="textTertiary" />
              </View>
            }
          />
          {conflicts > 0 ? (
            <>
              <Divider inset={spacing.lg} />
              <ListItem
                icon="git-compare-outline"
                iconColor="warning"
                iconBackground="warningMuted"
                title={t('account.conflicts', { count: conflicts })}
                subtitle={t('account.conflictsHint')}
                onPress={() => router.push('/sync/conflicts' as Href)}
              />
            </>
          ) : null}
          {space.kind === 'user' && importState?.state === 'copied' ? (
            <>
              <Divider inset={spacing.lg} />
              <ListItem
                icon="close-circle-outline"
                iconColor="textSecondary"
                iconBackground="surfaceMuted"
                title={t('account.cancelImport')}
                subtitle={t('account.importPending')}
                onPress={() => setDialog('cancelImport')}
                showChevron={false}
              />
            </>
          ) : importState?.state === 'declined' ? (
            <>
              <Divider inset={spacing.lg} />
              <ListItem
                icon="download-outline"
                iconColor="textSecondary"
                iconBackground="surfaceMuted"
                title={t('account.importData')}
                subtitle={t('account.importDataHint')}
                onPress={offerImport}
                showChevron={false}
              />
            </>
          ) : null}
        </Card>
      </Section>

      {children}

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
      <Dialog
        visible={dialog === 'cancelImport'}
        title={t('account.cancelImportTitle')}
        message={t('account.cancelImportMessage')}
        onDismiss={() => setDialog(null)}
        actions={[
          {
            label: t('account.cancelImport'),
            variant: 'destructive',
            onPress: async () => {
              await cancelImport(store);
              setDialog(null);
              setImportState(await getImportState(store));
              void syncNow();
            },
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setDialog(null) },
        ]}
      />
    </>
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
    width: 48,
    height: 48,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
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
});
