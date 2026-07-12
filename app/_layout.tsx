import '@/lib/sentry/bootstrap';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  DarkTheme,
  Stack,
  ThemeProvider as NavigationThemeProvider,
  type ErrorBoundaryProps,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { StartupErrorScreen, StartupShell, RemoteDataSyncEffect, AndroidNavigationBarEffect, AppSecurityBootstrap, BiometricGate, EmailDeepLinkHandler, QuickExpenseLinkHandler } from '@/components/app';
import { DiagnosticsBootstrap } from '@/components/diagnostics';
import { View } from 'react-native';
import { OnboardingGateEffect } from '@/components/onboarding/OnboardingGateEffect';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { logAppError } from '@/lib/diagnostics';
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider';
import { AppThemeProvider, useTheme } from '@/lib/theme';
export const unstable_settings = {
  initialRouteName: 'index',
};

void SplashScreen.preventAutoHideAsync().catch(() => {});

function NavigationThemeBridge({ children }: { children: React.ReactNode }) {
  const { colors: palette } = useTheme();
  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.surface,
      text: palette.text,
      border: palette.border,
      notification: palette.accent,
    },
  };

  return <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>;
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  logAppError('error-boundary', error);

  const devHint =
    __DEV__ && error instanceof Error && error.message
      ? `\n\n(${error.message})`
      : '';

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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

function wrapWithSentry(Component: typeof RootLayout) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/react-native') as typeof import('@sentry/react-native');
    return Sentry.wrap(Component);
  } catch {
    return Component;
  }
}

export default wrapWithSentry(RootLayout);

function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StartupShell>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
              <PreferencesProvider>
                <AppThemeProvider>
                  <ToastProvider>
                  <NavigationThemeBridge>
                  <StatusBar style="light" />
                  <DiagnosticsBootstrap />
                  <AndroidNavigationBarEffect />
                  <AppSecurityBootstrap>
                    <BiometricGate>
                      <EmailDeepLinkHandler />
                      <QuickExpenseLinkHandler />
                      <RootNavigator />
                    </BiometricGate>
                  </AppSecurityBootstrap>
                  </NavigationThemeBridge>
                  </ToastProvider>
                </AppThemeProvider>
              </PreferencesProvider>
          </AuthProvider>
        </QueryClientProvider>
      </StartupShell>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading, startupError, retryBootstrap } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoading) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  if (isLoading) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
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
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="reset-password" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="auth/callback"
          options={{ presentation: 'modal', animation: 'fade' }}
        />

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="calendar" />
          <Stack.Screen name="assistant" />
          <Stack.Screen name="open-banking/callback" options={{ animation: 'fade' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen
            name="quick-expense"
            options={{ presentation: 'transparentModal', animation: 'fade' }}
          />
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
