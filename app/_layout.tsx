import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  Stack,
  ThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupErrorScreen, StartupShell, RemoteDataSyncEffect, AndroidNavigationBarEffect, AppIntroSplash } from '@/components/app';
import { AuthLoadingScreen } from '@/components/auth';
import { OnboardingGateEffect } from '@/components/onboarding/OnboardingGateEffect';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider';
import { colors } from '@/lib/theme';
import { hasIntroCompletedThisSession } from '@/lib/app/intro-session';

export const unstable_settings = {
  initialRouteName: 'index',
};

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignora se o splash nativo já foi escondido (reload / OTA).
});

const SPLASH_MAX_MS = 5000;

const CentFlowTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
};

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  if (__DEV__) {
    console.error('[CentFlow] ErrorBoundary:', error);
  }

  const devHint =
    __DEV__ && error instanceof Error && error.message
      ? `\n\n(${error.message})`
      : '';

  return (
    <SafeAreaProvider>
      <StartupShell>
        <StartupErrorScreen
          error={error}
          onRetry={retry}
          message={
            'Ocorreu um erro inesperado. Podes tentar abrir a app novamente.' + devHint
          }
        />
      </StartupShell>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StartupShell>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ToastProvider>
              <PreferencesProvider>
                <ThemeProvider value={CentFlowTheme}>
                  <StatusBar style="light" />
                  <AndroidNavigationBarEffect />
                  <RootNavigator />
                </ThemeProvider>
              </PreferencesProvider>
            </ToastProvider>
          </AuthProvider>
        </QueryClientProvider>
      </StartupShell>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, startupError, retryBootstrap } = useAuth();
  const [introReady, setIntroReady] = useState(() => hasIntroCompletedThisSession());

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync().catch(() => {});
    }, SPLASH_MAX_MS);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  if (startupError) {
    return (
      <StartupErrorScreen
        message={startupError}
        onRetry={retryBootstrap}
        retryLoading={isLoading}
      />
    );
  }

  if (isAuthenticated && !introReady) {
    return (
      <GestureHandlerRootView style={styles.introRoot}>
        <AppIntroSplash onComplete={() => setIntroReady(true)} />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen
          name="auth/callback"
          options={{ presentation: 'modal', animation: 'fade' }}
        />

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>

      {isAuthenticated ? (
        <>
          <OnboardingGateEffect />
          <RemoteDataSyncEffect />
        </>
      ) : null}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  introRoot: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
