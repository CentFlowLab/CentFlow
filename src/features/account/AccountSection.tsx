import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
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
  ListItem,
  Section,
  Text,
  TextField,
} from '@/ui/components';
import { spacing } from '@/ui/theme';

import { useActiveSpace } from '../app-shell/DataGate';
import { useAuth } from './AuthProvider';
import { isAppleSignInAvailable } from './apple-sign-in';
import { markPendingAccountDeletion } from './pending-account-deletion';
import { useSync } from './SyncProvider';

type DialogKind = 'signOutPending' | 'delete' | 'deleteFailed' | 'cancelImport' | null;
type DeleteFailure = 'deleteFailed' | 'deleteReauthFailed';

const STATUS_TONE: Record<SyncStatus, 'positive' | 'neutral' | 'warning' | 'negative'> = {
  idle: 'positive',
  syncing: 'neutral',
  offline: 'warning',
  error: 'negative',
  authRequired: 'negative',
};

/** Definições › Conta e sincronização. */
export function AccountSection() {
  const { t } = useTranslation();
  const { state } = useAuth();

  if (state.status === 'unavailable') return null;
  if (state.status !== 'signedIn') {
    const expired = state.status === 'signedOut' && state.expired;
    return (
      <Section title={t('account.section')}>
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
    );
  }

  return <SignedInAccount user={state.user} />;
}

function SignedInAccount({ user }: { user: { id: string; email: string | null } }) {
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
  const [failure, setFailure] = useState<DeleteFailure>('deleteFailed');

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

  const deleteAccount = async () => {
    if (!client) return;
    setBusy(true);
    const reauth = password
      ? await actions.signIn(user.email ?? '', password)
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

  return (
    <Section title={t('account.section')}>
      <Card padding="xs">
        <ListItem
          icon="person-circle-outline"
          title={user.email ?? t('account.signedIn')}
          subtitle={t('account.signedIn')}
        />
        <Divider inset={spacing.lg} />
        <ListItem
          icon={status === 'offline' ? 'cloud-offline-outline' : 'cloud-done-outline'}
          title={t(`account.status.${status}`)}
          subtitle={
            pending > 0 ? `${t('account.pending', { count: pending })} · ${lastSynced}` : lastSynced
          }
          trailing={<Badge label={t(`account.statusShort.${status}`)} tone={STATUS_TONE[status]} />}
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
        <Divider inset={spacing.lg} />
        <ListItem
          icon="sync-outline"
          title={t('account.syncNow')}
          onPress={() => void syncNow()}
          showChevron={false}
        />
        {space.kind === 'user' && importState?.state === 'copied' ? (
          <>
            <Divider inset={spacing.lg} />
            <ListItem
              icon="close-circle-outline"
              title={t('account.cancelImport')}
              subtitle={t('account.importPending')}
              onPress={() => setDialog('cancelImport')}
              showChevron={false}
            />
          </>
        ) : importState?.state === 'declined' || importState?.state === 'none' ? (
          <>
            <Divider inset={spacing.lg} />
            <ListItem
              icon="download-outline"
              title={t('account.importData')}
              subtitle={t('account.importDataHint')}
              onPress={offerImport}
              showChevron={false}
            />
          </>
        ) : null}
        <Divider inset={spacing.lg} />
        <ListItem
          icon="log-out-outline"
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
          showChevron={false}
          onPress={() => setDialog('delete')}
        />
      </Card>

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
        <TextField
          label={t('account.deletePassword')}
          helperText={
            appleAvailable ? t('account.deleteAppleHint') : t('account.deletePasswordHint')
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          editable={!busy}
        />
      </Dialog>
      <Dialog
        visible={dialog === 'deleteFailed'}
        title={t('account.deleteAccount')}
        message={
          failure === 'deleteReauthFailed'
            ? t('account.deleteReauthFailed')
            : t('account.deleteFailed')
        }
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
    </Section>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
