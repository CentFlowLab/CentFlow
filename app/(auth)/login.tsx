import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreenLayout, AuthSocialDivider, GoogleSignInButton } from '@/components/auth';
import { Button, Card, Text, TextField } from '@/components/ui';
import { isMockAuthEnabled, loginSchema, useAuth, getAuthErrorMessage } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function LoginScreen() {
  const { signIn, signInWithGoogle, isGoogleSignInAvailable, sessionExpiredMessage } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleLogin() {
    setApiError(null);
    const result = loginSchema.safeParse({ email, password });

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
      await signIn(result.data);
      router.replace('/(tabs)');
    } catch (error) {
      setApiError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setApiError(null);
    setGoogleLoading(true);

    try {
      const completed = await signInWithGoogle();
      if (completed) {
        router.replace('/(tabs)');
      }
    } catch (error) {
      setApiError(getAuthErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreenLayout
      title="Bem-vindo de volta"
      subtitle="Inicia sessão para continuar a gerir as tuas finanças"
      footer={
        <View style={styles.footerLinks}>
          <Text variant="body" color="textSecondary">
            Ainda não tens conta?{' '}
          </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text variant="bodyMedium" color="primary" style={styles.link}>
                Criar conta
              </Text>
            </Pressable>
          </Link>
        </View>
      }>
      {sessionExpiredMessage ? (
        <Card variant="outlined" style={styles.infoCard} padding="md">
          <Text variant="caption" color="textSecondary">
            {sessionExpiredMessage}
          </Text>
        </Card>
      ) : null}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard} padding="md">
          <Text variant="caption" color="danger">
            {apiError}
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

      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        textContentType="password"
        error={errors.password}
      />

      <Link href="/(auth)/forgot-password" asChild>
        <Pressable style={styles.forgotLink}>
          <Text variant="caption" color="primary">
            Esqueceste a password?
          </Text>
        </Pressable>
      </Link>

      <Button
        label="Entrar"
        onPress={handleLogin}
        loading={loading}
        disabled={googleLoading}
        fullWidth
        size="lg"
        style={styles.submit}
      />

      {isGoogleSignInAvailable ? (
        <>
          <AuthSocialDivider />
          <GoogleSignInButton
            onPress={handleGoogleSignIn}
            loading={googleLoading}
            disabled={loading}
          />
          {isMockAuthEnabled() ? (
            <Text variant="caption" color="textMuted" align="center">
              Modo dev — simula conta Google sem OAuth real
            </Text>
          ) : null}
        </>
      ) : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  infoCard: {
    borderColor: colors.border,
    backgroundColor: colors.surfaceHighlight,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  forgotLink: {
    alignSelf: 'flex-end',
  },
  submit: {
    marginTop: spacing.sm,
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  link: {
    fontWeight: '600',
  },
});
