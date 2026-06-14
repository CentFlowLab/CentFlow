import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AuthLoadingScreen } from '@/components/auth';
import { Button, Card, Text } from '@/components/ui';
import { getAuthErrorMessage, resolveOAuthCallbackUrl, useAuth } from '@/lib/auth';
import { colors, spacing } from '@/lib/theme';

const DEEP_LINK_ATTEMPTS = 12;
const DEEP_LINK_POLL_MS = 150;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AuthCallbackScreen() {
  const { completeGoogleSignInFromCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(true);
  const deepLinkUrl = Linking.useURL();
  const handledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function readInitialUrl(): Promise<string | null> {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        return window.location.href;
      }
      return Linking.getInitialURL();
    }

    async function completeOAuth() {
      try {
        const initialUrl = await readInitialUrl();
        let callbackUrl: string | null = null;

        for (let attempt = 0; attempt < DEEP_LINK_ATTEMPTS; attempt += 1) {
          callbackUrl = await resolveOAuthCallbackUrl(initialUrl, deepLinkUrl);
          if (callbackUrl) break;
          await wait(DEEP_LINK_POLL_MS);
        }

        if (!callbackUrl) {
          if (mounted) router.replace('/(auth)/login');
          return;
        }

        if (handledRef.current) return;
        handledRef.current = true;

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
