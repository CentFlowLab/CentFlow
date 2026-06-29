import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { AuthScreenLayout } from '@/components/auth';
import { PasswordStrengthMeter } from '@/components/security/PasswordStrengthMeter';
import { Button, Card, Text, TextField } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { authService, getAuthErrorMessage, resetPasswordSchema } from '@/lib/auth';
import { logSecurityError } from '@/lib/security';
import { validatePassword, PASSWORD_POLICY_HINT } from '@/lib/security/passwordPolicy';
import { colors, spacing } from '@/lib/theme';

export default function ResetPasswordScreen() {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const handledRef = useRef(false);

  const passwordValidation = useMemo(() => validatePassword(password), [password]);
  const canSubmit = passwordValidation.valid && password === confirmPassword && sessionReady;

  useEffect(() => {
    let mounted = true;

    async function bootstrapRecovery(url: string | null) {
      // Evita processar o mesmo link duas vezes (getInitialURL + listener).
      if (handledRef.current) return;

      if (!url || !url.includes('reset-password')) {
        if (mounted) {
          setApiError('Link de recuperação inválido. Pede um novo email de redefinição.');
          setInitializing(false);
        }
        return;
      }

      handledRef.current = true;

      try {
        await authService.completePasswordRecoveryFromUrl(url);
        if (mounted) {
          setSessionReady(true);
          setApiError(null);
        }
      } catch (error) {
        handledRef.current = false;
        logSecurityError('password_recovery_link_failed', error);
        if (mounted) {
          setApiError(getAuthErrorMessage(error));
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    }

    void Linking.getInitialURL().then((url) => {
      if (mounted) void bootstrapRecovery(url);
    });

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void bootstrapRecovery(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  async function handleSubmit() {
    setApiError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0];
        if (typeof key === 'string') fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await authService.updatePasswordAfterRecovery(result.data.password);
      showToast('Palavra-passe atualizada.', 'success');
      router.replace('/(auth)/password-reset-success' as never);
    } catch (error) {
      logSecurityError('password_recovery_update_failed', error);
      setApiError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  if (initializing) {
    return (
      <AuthScreenLayout title="A preparar..." subtitle="A validar o link de recuperação">
        <Text variant="body" color="textMuted">
          Aguarda um momento.
        </Text>
      </AuthScreenLayout>
    );
  }

  return (
    <AuthScreenLayout
      title="Nova palavra-passe"
      subtitle="Escolhe uma palavra-passe forte para proteger a tua conta">
      {apiError ? (
        <Card variant="outlined" style={styles.errorCard} padding="md">
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <Text variant="caption" color="textMuted">
        {PASSWORD_POLICY_HINT}
      </Text>

      <TextField
        label="Nova palavra-passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
      />

      {password.length > 0 ? (
        <PasswordStrengthMeter
          strength={passwordValidation.strength}
          errors={passwordValidation.errors}
        />
      ) : null}

      <TextField
        label="Confirmar palavra-passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirmPassword}
      />

      <Button
        label="Guardar nova palavra-passe"
        onPress={handleSubmit}
        loading={loading}
        disabled={!canSubmit || loading}
        fullWidth
        size="lg"
      />
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
});
