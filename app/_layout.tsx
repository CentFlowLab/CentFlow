import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthLoadingScreen } from '@/components/auth';
import { OnboardingGateEffect } from '@/components/onboarding/OnboardingGateEffect';
import { ToastProvider } from '@/components/ui/Toast';
import { queryClient } from '@/lib/api';
import { AuthProvider, useAuth } from '@/lib/auth';
import { PreferencesProvider } from '@/lib/preferences/PreferencesProvider';
import { colors } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

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

export default function RootLayout() {
  return (
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
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync();
    }
  }, [isLoading]);

  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/*
        Onboarding gate (OnboardingGateEffect):
        - Sem onboarding concluído → redirecciona para /onboarding
        - Protege (tabs), settings/* e deep links autenticados
        - Bypass em dev: EXPO_PUBLIC_SKIP_ONBOARDING=true
      */}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="auth/callback" />

        <Stack.Protected guard={isAuthenticated}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
        </Stack.Protected>

        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>

      {isAuthenticated ? <OnboardingGateEffect /> : null}
    </GestureHandlerRootView>
  );
}
