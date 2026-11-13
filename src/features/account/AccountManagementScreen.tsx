import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { appStorage } from '@/lib/storage/key-value-store';
import { Button, Card, FormScreen, Text, TextField } from '@/ui/components';
import { spacing } from '@/ui/theme';

import { closeModal } from '../finance/navigation';
import { isAppleSignInAvailable } from './apple-sign-in';
import { useAuth, type AuthUser } from './AuthProvider';
import { isGoogleOnly, signedInRecently } from './google-sign-in';
import { PasswordField } from './PasswordField';
import { markPendingAccountDeletion } from './pending-account-deletion';
import { settingsHref } from '../settings/settings-sections';

type Step = 'overview' | 'delete' | 'done';
type Failure = 'deleteFailed' | 'deleteReauthFailed' | 'deleteGoogleStale';

const CONSEQUENCES = [
  'account',
  'finance',
  'integrations',
  'device',
  'otherDevices',
  'final',
] as const;

/** A frase escrita tem de ser a pedida (sem diferenças de maiúsculas ou espaços nas pontas). */
export function matchesDeletePhrase(typed: string, phrase: string): boolean {
  return typed.trim().toLocaleUpperCase() === phrase.toLocaleUpperCase();
}

/**
 * Gestão da conta (ADR-068): exportar dados e eliminar a conta. A eliminação fica aqui, longe do
 * uso diário, com as consequências, nova autenticação e a frase escrita antes de qualquer pedido.
 */
export function AccountManagementScreen() {
  const { t } = useTranslation();
  const { state } = useAuth();
  const close = () => closeModal(settingsHref('account'));

  return (
    <FormScreen
      title={t('account.management.title')}
      closeLabel={t('common.close')}
      onClose={close}>
      {state.status === 'signedIn' ? <Management user={state.user} /> : null}
    </FormScreen>
  );
}

function Management({ user }: { user: AuthUser }) {
  const { t } = useTranslation();
  const { client, actions } = useAuth();
  const [step, setStep] = useState<Step>('overview');
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [googleOnly, setGoogleOnly] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const phrase = t('account.management.phrase');
  const phraseOk = matchesDeletePhrase(typed, phrase);

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

  const fail = (kind: Failure) => {
    setBusy(false);
    setFailure(kind);
  };

  const deleteAccount = async () => {
    if (!client || busy || !phraseOk) return;
    setBusy(true);
    setFailure(null);
    // Só Google, sem palavra-passe: a confirmação é ter entrado há pouco (ADR-055).
    if (!password && googleOnly) {
      const { data } = await client.auth.getUser();
      if (!data.user || !signedInRecently(data.user)) return fail('deleteGoogleStale');
    }
    const reauth = password
      ? await actions.signIn(user.email ?? '', password)
      : googleOnly
        ? ({ ok: true, value: undefined } as const)
        : appleAvailable
          ? await actions.reauthenticateWithApple()
          : ({ ok: false, error: 'invalidCredentials' } as const);
    if (!reauth.ok) {
      if (reauth.error === 'cancelled') {
        setBusy(false);
        return;
      }
      return fail('deleteReauthFailed');
    }
    const { error } = await client.functions.invoke('delete-account', {
      method: 'POST',
      body: { confirm: 'DELETE' },
    });
    if (error) return fail('deleteFailed');
    // Servidor confirmou: a limpeza deste aparelho continua mesmo que a app feche agora.
    await markPendingAccountDeletion(appStorage, user.id);
    setPassword('');
    setBusy(false);
    setStep('done');
  };

  if (step === 'done') {
    return (
      <View style={styles.body}>
        <Text variant="title3" accessibilityRole="header" accessibilityLiveRegion="polite">
          {t('account.management.doneTitle')}
        </Text>
        <Text variant="callout" tone="secondary">
          {t('account.management.doneBody')}
        </Text>
        <Button
          label={t('account.management.doneAction')}
          loading={busy}
          onPress={async () => {
            setBusy(true);
            await actions.signOut();
          }}
        />
      </View>
    );
  }

  if (step === 'delete') {
    return (
      <View style={styles.body}>
        <Card>
          <View style={styles.section}>
            <Text variant="title3" accessibilityRole="header">
              {t('account.management.consequencesTitle')}
            </Text>
            {CONSEQUENCES.map((key) => (
              <View key={key} style={styles.bullet}>
                <Text variant="callout" tone="secondary" importantForAccessibility="no">
                  •
                </Text>
                <Text variant="callout" tone="secondary" style={styles.bulletText}>
                  {t(`account.management.consequences.${key}`)}
                </Text>
              </View>
            ))}
          </View>
        </Card>

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
        <TextField
          label={t('account.management.phraseLabel', { phrase })}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          autoComplete="off"
          editable={!busy}
          errorText={
            typed.trim().length >= phrase.length && !phraseOk
              ? t('account.management.phraseMismatch')
              : undefined
          }
        />
        {failure ? (
          <Text variant="footnote" tone="negative" accessibilityLiveRegion="polite">
            {t(`account.${failure}`)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Button
            label={t('account.deleteConfirm')}
            variant="destructive"
            loading={busy}
            disabled={!phraseOk || busy}
            onPress={() => void deleteAccount()}
          />
          <Button
            label={t('common.cancel')}
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setStep('overview');
              setPassword('');
              setTyped('');
              setFailure(null);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.body}>
      <Card>
        <View style={styles.section}>
          <Text variant="title3" accessibilityRole="header">
            {t('account.management.dataTitle')}
          </Text>
          <Text variant="callout" tone="secondary">
            {t('account.management.dataBody')}
          </Text>
          <Button
            label={t('account.management.export')}
            icon="download-outline"
            variant="secondary"
            onPress={() => router.push('/backup' as Href)}
          />
        </View>
      </Card>
      <Card>
        <View style={styles.section}>
          <Text variant="title3" accessibilityRole="header">
            {t('account.management.deleteTitle')}
          </Text>
          <Text variant="callout" tone="secondary">
            {t('account.management.deleteBody')}
          </Text>
          <Button
            label={t('account.management.deleteStart')}
            variant="secondary"
            onPress={() => setStep('delete')}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  section: { gap: spacing.sm },
  bullet: { flexDirection: 'row', gap: spacing.sm },
  bulletText: { flex: 1 },
  actions: { gap: spacing.sm },
});
