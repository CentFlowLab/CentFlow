import '@/i18n';

import { Stack } from 'expo-router';

import { AppProviders } from '@/features/app-shell/AppProviders';

export { RootErrorBoundary as ErrorBoundary } from '@/features/app-shell/RootErrorBoundary';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="new-transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
    </AppProviders>
  );
}
