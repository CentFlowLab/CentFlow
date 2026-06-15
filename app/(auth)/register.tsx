import { Link, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AuthScreenLayout, AuthSocialDivider, GoogleSignInButton } from '@/components/auth';
import { Button, Card, Text, TextField } from '@/components/ui';
import { isMockAuthEnabled, registerSchema, useAuth, getAuthErrorMessage } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, isGoogleSignInAvailable } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleRegister() {
    setApiError(null);
    const result = registerSchema.safeParse({
      name,
      email,
      password,
      confirmPassword,
    });

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
      await signUp({
        name: result.data.name,
        email: result.data.email,
        password: result.data.password,
      });
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
      title="Criar conta"
      subtitle="Começa a perceber para onde vai cada cêntimo"
      footer={
        <View style={styles.footerLinks}>
          <Text variant="body" color="textSecondary">
            Já tens conta?{' '}
          </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text variant="bodyMedium" color="primary" style={styles.link}>
                Entrar
              </Text>
            </Pressable>
          </Link>
        </View>
      }>
      {isMockAuthEnabled() && (
        <Card variant="outlined" style={styles.devBanner} padding="md">
          <Text variant="caption" color="primary">
            Modo desenvolvimento — registo sem API
          </Text>
        </Card>
      )}

      {apiError ? (
        <Card variant="outlined" style={styles.errorCard} padding="md">
          <Text variant="caption" color="danger">
            {apiError}
          </Text>
        </Card>
      ) : null}

      <TextField
        label="Nome"
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
        error={errors.name}
      />

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
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.password}
      />

      <TextField
        label="Confirmar password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        error={errors.confirmPassword}
      />

      <Button
        label="Criar conta"
        onPress={handleRegister}
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
        </>
      ) : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  devBanner: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    marginBottom: spacing.sm,
  },
  errorCard: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
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
