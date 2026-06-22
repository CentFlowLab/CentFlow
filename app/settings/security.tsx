import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  SettingsHero,
  SettingsScreenLayout,
  SettingsToggleRow,
} from '@/components/settings';
import { Button, Card, LoadingSpinner, Text } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { useActiveSessions } from '@/hooks/queries/useActiveSessions';
import { useUpdatePreferences, useUserPreferences } from '@/hooks/queries/useUserPreferences';
import { authService, useAuth } from '@/lib/auth';
import { isMockAuthEnabled } from '@/lib/auth/mock-auth';
import { signOutAllDevices } from '@/lib/api/services/profile.service';
import {
  getBiometricSupport,
  logSecurityError,
  logSecurityEvent,
  setBiometricLockEnabled,
} from '@/lib/security';
import { spacing } from '@/lib/theme';

export default function SecurityScreen() {
  const { user, signOut } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();
  const { data: sessions, isLoading: sessionsLoading } = useActiveSessions();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();
  const [resetLoading, setResetLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  async function handleToggleBiometrics(value: boolean) {
    if (value) {
      const support = await getBiometricSupport();
      if (!support.available) {
        showToast('Biometria indisponível neste dispositivo.', 'info');
        return;
      }
    }

    try {
      await updatePreferences.mutateAsync({ biometricsEnabled: value });
      await setBiometricLockEnabled(value);
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

  function handleResetPassword() {
    if (!user?.email) {
      showToast('Email da conta indisponível.', 'error');
      return;
    }

    Alert.alert(
      'Redefinir password',
      `Enviaremos um email para ${user.email} com instruções para redefinir a password.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Enviar email',
          onPress: () => {
            setResetLoading(true);
            void authService
              .requestPasswordReset(user.email)
              .then(() => {
                logSecurityEvent('password_reset_requested');
                showToast(
                  'Enviámos um email com instruções para redefinir a password.',
                  'success',
                );
              })
              .catch((error) => {
                logSecurityError('password_reset_request_failed', error);
                showToast('Não foi possível enviar o email. Tenta novamente.', 'error');
              })
              .finally(() => setResetLoading(false));
          },
        },
      ],
    );
  }

  async function handleSecureSignOut() {
    setLoggingOut(true);
    try {
      await signOut();
      logSecurityEvent('secure_sign_out');
    } finally {
      setLoggingOut(false);
    }
  }

  function handleSignOutAllDevices() {
    Alert.alert(
      'Terminar sessão em todos os dispositivos',
      'Isto encerra a tua conta em todos os telemóveis e browsers. Terás de iniciar sessão novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar todas',
          style: 'destructive',
          onPress: () => {
            setLoggingOutAll(true);
            void signOutAllDevices()
              .then(() => signOut())
              .then(() => {
                logSecurityEvent('global_sign_out');
                showToast('Sessão terminada em todos os dispositivos.', 'success');
              })
              .catch((error) => {
                logSecurityError('global_sign_out_failed', error);
                showToast('Não foi possível terminar todas as sessões.', 'error');
              })
              .finally(() => setLoggingOutAll(false));
          },
        },
      ],
    );
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
        description="Credenciais, bloqueio local e sessão."
      />

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Redefinir password</Text>
          <Text variant="caption" color="textMuted">
            {isMockAuthEnabled()
              ? 'Indisponível em modo demonstração.'
              : 'Recebe um email seguro para definires uma nova palavra-passe forte.'}
          </Text>
          <Button
            label={resetLoading ? 'A enviar...' : 'Redefinir password'}
            variant="secondary"
            onPress={handleResetPassword}
            loading={resetLoading}
            disabled={isMockAuthEnabled() || resetLoading}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <SettingsToggleRow
            label="Proteger aplicação"
            description="Face ID ou impressão digital ao abrir a app"
            value={preferences?.biometricsEnabled ?? false}
            onValueChange={handleToggleBiometrics}
            disabled={updatePreferences.isPending}
          />
          <Text variant="caption" color="textMuted">
            PIN local estará disponível em breve como alternativa.
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
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
              <Button
                label={loggingOutAll ? 'A terminar...' : 'Terminar sessão em todos os dispositivos'}
                variant="secondary"
                onPress={handleSignOutAllDevices}
                loading={loggingOutAll}
                disabled={isMockAuthEnabled() || loggingOutAll}
              />
            </>
          )}
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Privacidade dos dados</Text>
          <Text variant="caption" color="textMuted">
            Exportação, consentimentos e política de privacidade.
          </Text>
          <Button
            label="Abrir privacidade"
            variant="secondary"
            onPress={() => router.push('/settings/privacy' as never)}
          />
        </Card>
      </View>

      <Button
        label={loggingOut ? 'A terminar sessão...' : 'Terminar sessão em segurança'}
        variant="danger"
        onPress={handleSecureSignOut}
        loading={loggingOut}
        fullWidth
      />
    </SettingsScreenLayout>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing['2xl'],
  },
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
