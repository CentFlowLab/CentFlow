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
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StartupErrorScreen, StartupShell, RemoteDataSyncEffect } from '@/components/app';
import { AuthLoadingScreen } from '@/components/auth';
import { OnboardingGateEffect } from '@/components/onboarding/OnboardingGateEffect';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider';
import { colors } from '@/lib/theme';

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
  return (
    <SafeAreaProvider>
      <StartupShell>
        <StartupErrorScreen
          error={error}
          onRetry={retry}
          message="Ocorreu um erro inesperado. Podes tentar abrir a app novamente."
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
