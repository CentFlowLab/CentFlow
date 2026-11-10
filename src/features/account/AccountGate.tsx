import { useEffect, useState, type PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ANONYMOUS_SPACE, deleteLocalSpace, type LocalSpace } from '@/data';
import { appStorage } from '@/lib/storage/key-value-store';
import { usePreferences } from '@/features/preferences';
import { EmptyState } from '@/ui/components';
import { useTheme } from '@/ui/theme';

import { DataGate } from '../app-shell/DataGate';
import { appAccessFor, type AppAccess } from './app-access';
import { emailLocaleFor, useAuth } from './AuthProvider';
import { ConfirmEmailScreen } from './ConfirmEmailScreen';
import { resumePendingAccountDeletion } from './pending-account-deletion';
import { SyncProvider } from './SyncProvider';

/** Acesso à app a partir do estado da sessão (ver `app-access.ts`). */
export function useAppAccess(): AppAccess {
  const { state } = useAuth();
  return appAccessFor(state, __DEV__);
}

/**
 * Só abre dados com conta. Com sessão, a base de dados dessa conta; sem sessão, nenhuma: as rotas
 * de dados ficam protegidas (`Stack.Protected` no layout raiz) e só se vê as boas-vindas e a
 * autenticação. Sair da conta não apaga a base de dados da conta.
 */
export function AccountGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state, actions, pending } = useAuth();
  const access = useAppAccess();
  const [resumeSettled, setResumeSettled] = useState(false);
  const userId = state.status === 'signedIn' ? state.user.id : null;
  const { activeLanguage } = usePreferences();
  const savedLocale = state.status === 'signedIn' ? state.user.locale : null;

  // Os emails de autenticação usam a língua guardada na conta: acompanha a da app.
  useEffect(() => {
    if (!userId) return;
    const wanted = emailLocaleFor(activeLanguage);
    if (savedLocale !== wanted) void actions.updateEmailLocale(wanted);
  }, [actions, activeLanguage, savedLocale, userId]);

  useEffect(() => {
    if (state.status === 'loading') return;
    let active = true;
    void resumePendingAccountDeletion({
      storage: appStorage,
      currentUserId: userId,
      signOut: async () => {
        await actions.signOut();
      },
      deleteSpace: (id) => deleteLocalSpace({ kind: 'user', userId: id }),
    })
      .catch(() => undefined)
      .finally(() => {
        if (active) setResumeSettled(true);
      });
    return () => {
      active = false;
    };
  }, [actions, state.status, userId]);

  if (access === 'loading' || !resumeSettled) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('database.opening')} />
      </View>
    );
  }

  if (access === 'misconfigured') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState
          icon="cloud-offline-outline"
          title={t('welcome.misconfiguredTitle')}
          description={t('welcome.misconfiguredDescription')}
        />
      </View>
    );
  }

  // Conta à espera do email: não se sai deste ecrã até confirmar ou escolher outra conta.
  if (access === 'signedOut') return pending ? <ConfirmEmailScreen pending={pending} /> : children;

  // `unavailable` só chega aqui em desenvolvimento e nos testes (sem Supabase configurado).
  const space: LocalSpace =
    state.status === 'signedIn' ? { kind: 'user', userId: state.user.id } : ANONYMOUS_SPACE;

  return (
    <DataGate space={space}>
      <SyncProvider>{children}</SyncProvider>
    </DataGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
