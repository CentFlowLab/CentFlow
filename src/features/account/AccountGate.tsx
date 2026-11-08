import type { PropsWithChildren } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ANONYMOUS_SPACE, type LocalSpace } from '@/data';
import { useTheme } from '@/ui/theme';

import { DataGate } from '../app-shell/DataGate';
import { useAuth } from './AuthProvider';
import { SyncProvider } from './SyncProvider';

/**
 * Escolhe o espaço local: com sessão, a base de dados dessa conta; sem sessão, a do uso sem
 * conta. Sair da conta muda de espaço sem apagar nada.
 */
export function AccountGate({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { state } = useAuth();

  if (state.status === 'loading') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('database.opening')} />
      </View>
    );
  }

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
