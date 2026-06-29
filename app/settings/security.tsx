import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

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
import {
  getBiometricSupport,
  logSecurityError,
  logSecurityEvent,
  setBiometricLockEnabled,
} from '@/lib/security';
import { spacing } from '@/lib/theme';

export default function SecurityScreen() {
  const { user, signOut, signOutAllDevices } = useAuth();
  const { data: preferences, isLoading: prefsLoading } = useUserPreferences();
  const { data: sessions, isLoading: sessionsLoading } = useActiveSessions();
  const updatePreferences = useUpdatePreferences();
  const { showToast } = useToast();
  const [resetLoading, setResetLoading] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [signOutAllLoading, setSignOutAllLoading] = useState(false);

  async function applyBiometricsPreference(value: boolean) {
    try {
      await updatePreferences.mutateAsync({ biometricsEnabled: value });
      await setBiometricLockEnabled(value);
      showToast(
        value
          ? 'Protecção ativada. Será pedida ao abrir a app.'
          : 'Protecção desativada.',
        'success',
      );
    } catch {
      showToast('Não foi possível guardar a preferência.', 'error');
    }
  }

  async function disableWithPassword(password: string) {
    const email = user?.email;
    if (!email) {
      showToast('Email da conta indisponível.', 'error');
      return;
    }
    if (!password) {
      showToast('Password necessária para desativar.', 'error');
      return;
    }
    try {
      // Confirma a identidade com password — nunca com FaceID (escape do loop).
      await authService.login({ email, password });
      logSecurityEvent('biometric_disabled_with_password');
      await applyBiometricsPreference(false);
    } catch {
      showToast('Password incorrecta. A biometria continua ativa.', 'error');
    }
  }

  function requestDisableBiometrics() {
    // Em modo demonstração não há password real para validar.
    if (isMockAuthEnabled()) {
      void applyBiometricsPreference(false);
      return;
    }

    if (Platform.OS === 'ios' && typeof Alert.prompt === 'function') {
      Alert.prompt(
        'Desativar biometria',
        'Por segurança, confirma a tua password para desativar o Face ID / impressão digital.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: (password?: string) => void disableWithPassword(password ?? ''),
          },
        ],
        'secure-text',
      );
      return;
    }

    // Fallback (Android/web): confirmação simples sem campo de password nativo.
    Alert.alert(
      'Desativar biometria',
      'Vais desativar o bloqueio biométrico. Terás de usar email e password para entrar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desativar',
          style: 'destructive',
          onPress: () => void applyBiometricsPreference(false),
        },
      ],
    );
  }

  async function handleToggleBiometrics(value: boolean) {
    if (value) {
      const support = await getBiometricSupport();
      if (!support.available) {
        showToast('Biometria indisponível neste dispositivo.', 'info');
        return;
      }
      await applyBiometricsPreference(true);
      return;
    }

    // Desativar exige confirmação por password (nunca FaceID).
    requestDisableBiometrics();
  }

  function handleResetPassword() {
    if (!user?.email) {
      showToast('Email da conta indisponível.', 'error');
      return;
    }

    Alert.alert(
      'Alterar password',
      `Enviaremos um email seguro para ${user.email} com instruções para definires uma nova password.`,
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

  function handleSignOutAllDevices() {
    Alert.alert(
      'Terminar sessão em todos os dispositivos',
      'Isto desliga a tua conta em todos os telemóveis e browsers. Terás de iniciar sessão novamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Terminar todas',
          style: 'destructive',
          onPress: () => {
            setSignOutAllLoading(true);
            void signOutAllDevices()
              .catch(() => {
                showToast('Não foi possível terminar todas as sessões.', 'error');
              })
              .finally(() => setSignOutAllLoading(false));
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
        description="Credenciais, bloqueio local e sessões."
      />

      <View style={styles.section}>
        <Card variant="elevated" style={styles.card}>
          <Text variant="bodyMedium">Alterar password</Text>
          <Text variant="caption" color="textMuted">
            {isMockAuthEnabled()
              ? 'Indisponível em modo demonstração.'
              : 'Por segurança, alteramos a password apenas via email com link seguro.'}
          </Text>
          <Button
            label={resetLoading ? 'A enviar...' : 'Enviar email de alteração'}
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
            description="Face ID ou impressão digital ao abrir a CentFlow"
            value={preferences?.biometricsEnabled ?? false}
            onValueChange={handleToggleBiometrics}
            disabled={updatePreferences.isPending}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <Card variant="outlined" style={styles.card}>
          <Text variant="bodyMedium">Dispositivos ligados</Text>
          {sessionsLoading ? (
            <Text variant="caption" color="textMuted">
              A verificar sessões...
            </Text>
          ) : (
            <>
              <Text variant="caption" color="textMuted">
                Este dispositivo está ativo. Outros dispositivos com sessão aberta podem
                continuar ligados até terminares todas as sessões.
              </Text>
              <View style={styles.sessionRow}>
                <Text variant="body">{sessions?.currentDeviceLabel ?? 'Este dispositivo'}</Text>
                <Text variant="caption" color="success">
                  Atual
                </Text>
              </View>
              <Button
                label={signOutAllLoading ? 'A terminar...' : 'Terminar sessão em todos'}
                variant="secondary"
                onPress={handleSignOutAllDevices}
                loading={signOutAllLoading}
                disabled={isMockAuthEnabled() || signOutAllLoading}
              />
            </>
          )}
        </Card>
      </View>

      <Button
        label={loggingOut ? 'A terminar sessão...' : 'Terminar sessão neste dispositivo'}
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
