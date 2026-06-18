import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { AuthScreenLayout } from '@/components/auth';
import { Button, Card, Text, TextField } from '@/components/ui';
import { authService, forgotPasswordSchema } from '@/lib/auth';
import { getAuthErrorMessage } from '@/lib/auth/errors';
import { colors, spacing } from '@/lib/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setApiError(null);
    setSuccess(false);

    const result = forgotPasswordSchema.safeParse({ email });
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
      await authService.requestPasswordReset(result.data.email);
      setSuccess(true);
    } catch (error) {
      setApiError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Recuperar password"
      subtitle="Enviaremos instruções para o teu email"
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable>
            <Text variant="bodyMedium" color="primary" style={styles.link}>
              ← Voltar ao login
            </Text>
          </Pressable>
        </Link>
      }>
      {apiError ? (
        <Card variant="outlined" style={styles.errorCard} padding="md">
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      {success ? (
        <Card variant="elevated" style={styles.successCard} padding="md">
          <Text variant="bodyMedium" color="success">
            Email enviado!
          </Text>
          <Text variant="caption" color="textSecondary">
            Enviámos um email com instruções para redefinir a password.
          </Text>
        </Card>
      ) : null}

      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        error={errors.email}
      />

      <Button
        label="Enviar instruções"
        onPress={handleSubmit}
        loading={loading}
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
  successCard: {
    gap: spacing.xs,
    borderColor: colors.success,
    backgroundColor: colors.successMuted,
  },
  link: {
    fontWeight: '600',
  },
});
