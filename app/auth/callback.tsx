import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthLoadingScreen } from '@/components/auth';
import { Button, Card, Text } from '@/components/ui';
import { getAuthErrorMessage, resolveOAuthCallbackUrl, useAuth } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

export default function AuthCallbackScreen() {
  const { completeGoogleSignInFromCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const deepLinkUrl = Linking.useURL();

  useEffect(() => {
    let mounted = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    async function completeOAuth() {
      try {
        const initialUrl =
          Platform.OS === 'web' && typeof window !== 'undefined'
            ? window.location.href
            : await Linking.getInitialURL();

        const callbackUrl = await resolveOAuthCallbackUrl(initialUrl, deepLinkUrl);

        if (!callbackUrl) {
          redirectTimer = setTimeout(() => {
            if (mounted) router.replace('/(auth)/login');
          }, 120);
          return;
        }

        await completeGoogleSignInFromCallback(callbackUrl);

        if (!mounted) return;
        router.replace('/(tabs)');
      } catch (callbackError) {
        if (!mounted) return;
        setError(getAuthErrorMessage(callbackError));
      } finally {
        if (mounted) setIsResolving(false);
      }
    }

    completeOAuth();

    return () => {
      mounted = false;
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [completeGoogleSignInFromCallback, deepLinkUrl]);

  if (isResolving && !error) {
    return <AuthLoadingScreen message="A concluir login com Google..." />;
  }

  if (error) {
    return (
      <View style={styles.errorScreen}>
        <Card variant="outlined" style={styles.errorCard} padding="lg">
          <Text variant="h3" style={styles.errorTitle}>
            Login interrompido
          </Text>
          <Text variant="body" color="textSecondary">
            {error}
          </Text>
          <Button
            label="Voltar ao login"
            onPress={() => router.replace('/(auth)/login')}
            fullWidth
            size="lg"
            style={styles.backButton}
          />
        </Card>
      </View>
    );
  }

  return <AuthLoadingScreen message="A redirecionar..." />;
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing['2xl'],
  },
  errorCard: {
    gap: spacing.md,
    borderColor: colors.danger,
    backgroundColor: colors.dangerMuted,
  },
  errorTitle: {
    color: colors.danger,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
