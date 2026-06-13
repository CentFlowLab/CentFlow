import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  ChangePasswordModal,
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { useActiveSessions } from '@/hooks/queries/useActiveSessions';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { spacing } from '@/lib/theme';

export default function SecurityScreen() {
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();
  const { data: sessions, isLoading: sessionsLoading } = useActiveSessions();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  async function handleToggleBiometrics(value: boolean) {
    try {
      await updatePreferences.mutateAsync({ biometricsEnabled: value });
      showToast(
        value
          ? 'Biometria activada. Será pedida ao abrir a app.'
          : 'Biometria desactivada.',
        'success',
      );
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  if (prefsLoading && !preferences) {
    return (
      <SettingsScreenLayout title="Segurança" subtitle="Protege a tua conta e dados">
        <LoadingSpinner message="A carregar..." />
      </SettingsScreenLayout>
    );
  }

  return (
    <SettingsScreenLayout title="Segurança" subtitle="Protege a tua conta e dados">
      <SettingsHero
        icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
        title="Controlo de acesso"
        description="Gere credenciais e métodos de desbloqueio da app."
      />

      <Card variant="elevated" style={styles.card}>
        <Text variant="bodyMedium">Palavra-passe</Text>
        <Text variant="caption" color="textMuted">
          {isMockAuthEnabled()
            ? 'Em modo demonstração, a alteração é simulada localmente.'
            : 'Altera a palavra-passe da tua conta CentFlow.'}
        </Text>
        <Button
          label="Alterar palavra-passe"
          variant="secondary"
          onPress={() => setPasswordModalVisible(true)}
        />
      </Card>

      <Card variant="outlined" style={styles.card}>
        <SettingsToggleRow
          label="Desbloqueio biométrico"
          description="Face ID ou impressão digital ao abrir a app"
          value={preferences?.biometricsEnabled ?? false}
          onValueChange={handleToggleBiometrics}
          disabled={updatePreferences.isPending}
        />
      </Card>

      <Card variant="outlined" style={styles.card}>
        <Text variant="bodyMedium">Sessões activas</Text>
        {sessionsLoading ? (
          <Text variant="caption" color="textMuted">
            A verificar sessões...
          </Text>
        ) : (
          <>
            <Text variant="caption" color="textMuted">
              {sessions?.count ?? 1} dispositivo{(sessions?.count ?? 1) === 1 ? '' : 's'} ligado
              {(sessions?.count ?? 1) === 1 ? '' : 's'}
            </Text>
            <View style={styles.sessionRow}>
              <Text variant="body">{sessions?.currentDeviceLabel ?? 'Este dispositivo'}</Text>
              <Text variant="caption" color="success">
                Actual
              </Text>
            </View>
          </>
        )}
      </Card>

      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
});
