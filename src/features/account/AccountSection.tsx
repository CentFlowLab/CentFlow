import { router, type Href } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { cancelImport, getImportState, type ImportState, type SyncStatus } from '@/data';
import { useLocaleFormat } from '@/i18n';
import { appStorage } from '@/lib/storage/key-value-store';
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
import { PasswordField } from './PasswordField';
import { isAppleSignInAvailable } from './apple-sign-in';
import { isGoogleOnly, signedInRecently } from './google-sign-in';
import { markPendingAccountDeletion } from './pending-account-deletion';
import { useSync } from './SyncProvider';

type DialogKind =
  | 'signOutPending'
  | 'delete'
  | 'deleteFailed'
  | 'cancelImport'
  | 'passwordSent'
  | 'passwordFailed'
  | null;
type DeleteFailure = 'deleteFailed' | 'deleteReauthFailed' | 'deleteGoogleStale';

const STATUS_TONE: Record<SyncStatus, 'positive' | 'neutral' | 'warning' | 'negative'> = {
  idle: 'positive',
  syncing: 'neutral',
  offline: 'warning',
  error: 'negative',
  authRequired: 'negative',
};

/**
 * Definições: "Conta" no topo e "Zona de perigo" (terminar sessão, eliminar conta) no fundo, com
 * as restantes secções (`children`) entre as duas. Partilham o estado dos diálogos.
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
  const { client, actions } = useAuth();
  const { space, store } = useActiveSpace();
  const { snapshot, syncNow, offerImport } = useSync();
  const { formatDateTime } = useLocaleFormat();
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [busy, setBusy] = useState(false);
  const [importState, setImportState] = useState<ImportState | null>(null);
  const [password, setPassword] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [failure, setFailure] = useState<DeleteFailure>('deleteFailed');

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getUser().then(({ data }) => {
      if (active && data.user) setGoogleOnly(isGoogleOnly(data.user));
    });
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => {
    let active = true;
    void isAppleSignInAvailable().then((available) => {
      if (active) setAppleAvailable(available);
    });
    return () => {
      active = false;
    };
  }, []);

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

  const deleteAccount = async () => {
    if (!client) return;
    setBusy(true);
    // Só Google, sem palavra-passe: a confirmação é ter entrado há pouco (ADR-055).
    if (!password && googleOnly) {
      const { data } = await client.auth.getUser();
      if (!data.user || !signedInRecently(data.user)) {
        setBusy(false);
        setFailure('deleteGoogleStale');
        setDialog('deleteFailed');
        return;
      }
    }
    const reauth = password
      ? await actions.signIn(user.email ?? '', password)
      : googleOnly
        ? ({ ok: true, value: undefined } as const)
        : appleAvailable
          ? await actions.reauthenticateWithApple()
          : ({ ok: false, error: 'invalidCredentials' } as const);
    if (!reauth.ok) {
      setBusy(false);
      if (reauth.error === 'cancelled') return;
      setFailure('deleteReauthFailed');
      setDialog('deleteFailed');
      return;
    }
    const { error } = await client.functions.invoke('delete-account', {
      method: 'POST',
      body: { confirm: 'DELETE' },
    });
    if (error) {
      setBusy(false);
      setFailure('deleteFailed');
      setDialog('deleteFailed');
      return;
    }
    await markPendingAccountDeletion(appStorage, user.id);
    setPassword('');
    await actions.signOut();
    setBusy(false);
    setDialog(null);
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

      <Section title={t('settings.groups.danger')}>
        <Card padding="xs">
          <ListItem
            icon="log-out-outline"
            iconColor="textSecondary"
            iconBackground="surfaceMuted"
            title={t('account.signOut')}
            showChevron={false}
            onPress={() => (pending > 0 ? setDialog('signOutPending') : void signOut())}
          />
          <Divider inset={spacing.lg} />
          <ListItem
            icon="trash-outline"
            iconColor="negative"
            iconBackground="negativeMuted"
            title={t('account.deleteAccount')}
            subtitle={t('settings.deleteAccountHint')}
            tone="negative"
            showChevron={false}
            onPress={() => setDialog('delete')}
          />
        </Card>
      </Section>

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
        visible={dialog === 'delete'}
        title={t('account.deleteTitle')}
        message={t('account.deleteMessage')}
        onDismiss={() => (busy ? undefined : setDialog(null))}
        actions={[
          {
            label: t('account.deleteConfirm'),
            variant: 'destructive',
            loading: busy,
            onPress: deleteAccount,
          },
          { label: t('common.cancel'), variant: 'ghost', onPress: () => setDialog(null) },
        ]}>
        <PasswordField
          label={t('account.deletePassword')}
          helperText={
            googleOnly
              ? t('account.deleteGoogleHint')
              : appleAvailable
                ? t('account.deleteAppleHint')
                : t('account.deletePasswordHint')
          }
          value={password}
          onChangeText={setPassword}
          editable={!busy}
        />
      </Dialog>
      <Dialog
        visible={dialog === 'deleteFailed'}
        title={t('account.deleteAccount')}
        message={
          failure === 'deleteReauthFailed'
            ? t('account.deleteReauthFailed')
            : failure === 'deleteGoogleStale'
              ? t('account.deleteGoogleStale')
              : t('account.deleteFailed')
        }
        onDismiss={() => setDialog(null)}
        actions={[{ label: t('common.ok'), onPress: () => setDialog(null) }]}
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
